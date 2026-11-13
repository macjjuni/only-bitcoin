import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import {
  type AnimationClip,
  AnimationUtils,
  Group,
  type Material,
  type Mesh,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { SpaceBossAttack } from "@/entities/space";
import { toVersionedModelUrl } from "./modelAssetUrl";

/**
 * 레이드 보스 모델 로더.
 *
 * 아바타는 구운 프레임과 `InstancedMesh` 로 그리지만 보스는 한 마리라 스킨 메시와
 * `AnimationMixer` 를 그대로 씀. 여기서는 받은 GLB 를 재생하기 좋게 손보는 일만 함.
 * 재생은 `bossAnimator.ts` 가 맡음.
 */

/** 빌드 때 파일 해시를 붙임. 에셋을 다시 구우면 주소가 바뀌어 캐시를 건너뜀. */
export const BOSS_MODEL_URL = toVersionedModelUrl("/models/bear-raid-boss.glb");

/** GLB 클립 이름. 굽는 쪽과 **같은 문자열**이어야 함. */
export const BOSS_CLIP_NAMES = {
  swipe: "Swipe",
  slam: "Slam",
  charge: "Charge",
  idle: "Idle",
  walk: "Walk",
  run: "Run",
  turn: "Turn",
  hit: "Hit",
  stagger: "Stagger",
  enrage: "Enrage",
  spawn: "Spawn",
  death: "Death",
} as const;

export type BossClipKey = keyof typeof BOSS_CLIP_NAMES;

/** GLB 노드 이름. three 가 `.` 과 공백을 지운 뒤의 이름임. */
export const BOSS_NODE_NAMES = {
  rig: "Bear_Rig",
  rootBone: "root",
  aoe: { swipe: "AOE_Swipe", slam: "AOE_Slam", charge: "AOE_Charge" },
  aoeAnchor: "Boss_AOE_Anchor",
} as const satisfies {
  rig: string;
  rootBone: string;
  aoe: Record<SpaceBossAttack, string>;
  aoeAnchor: string;
};

export interface BossModel {
  /** 씬 그래프 전체. `<primitive>` 로 원점에 붙임. 믹서도 이걸 뿌리로 씀. */
  scene: Group;
  /** 보스 몸. 위치·방향을 여기에 넣음. */
  rig: Object3D;
  /**
   * 바닥 예고 표시 묶음. 공격을 시작한 자리에 박아 둠.
   *
   * 원본에서는 예고 노드가 씬 최상위에 있어 보스와 따로 움직일 방법이 없었음.
   */
  aoeAnchor: Group;
  /** 예고 노드. 크기가 0 이면 그리지 않게 끄려고 들고 있음. */
  aoeRoots: readonly Object3D[];
  clips: Readonly<Record<BossClipKey, AnimationClip>>;
}

interface BossGltf {
  scene: Group;
  animations: AnimationClip[];
}

// region [Privates]
const isMesh = (object: Object3D): object is Mesh => {
  return (object as Mesh).isMesh === true;
};

const requireNode = (scene: Group, name: string): Object3D => {
  const node = scene.getObjectByName(name);

  if (!node) {
    throw new Error(`보스 GLB 에 '${name}' 노드가 없습니다. 에셋이 바뀌었는지 확인하세요.`);
  }

  return node;
};

const requireClip = (animations: readonly AnimationClip[], name: string): AnimationClip => {
  const clip = animations.find((candidate) => candidate.name === name);

  if (!clip) {
    throw new Error(`보스 GLB 에 '${name}' 모션이 없습니다. 에셋이 바뀌었는지 확인하세요.`);
  }

  return clip;
};

/**
 * 돌진 모션에서 루트 전진을 뺌.
 *
 * 원본은 모션 안에서 9 m 나아가고 끝난 자리에 그대로 서 있음. 위치는 서버가 정하므로
 * 모션까지 움직이면 두 번 나아감. 전진은 `resolveBossChargeTravel` 이 대신함.
 */
const stripRootMotion = (clip: AnimationClip): AnimationClip => {
  const stripped = clip.clone();
  stripped.tracks = stripped.tracks.filter(
    (track) => track.name !== `${BOSS_NODE_NAMES.rootBone}.position`,
  );

  return stripped;
};

/**
 * 피격 모션을 얹는 모션으로 바꿈.
 *
 * 첫 프레임(준비 자세)과의 차이만 남겨서, 공격 중이든 걷는 중이든 그 위에 움찔만 더함.
 * 예고 표시 트랙은 뺌. 얹는 모션이 크기를 건드리면 예고가 깜빡임.
 */
const toAdditiveHitClip = (clip: AnimationClip, boneNames: ReadonlySet<string>): AnimationClip => {
  const additive = clip.clone();
  additive.tracks = additive.tracks.filter((track) => {
    const nodeName = track.name.slice(0, track.name.lastIndexOf("."));

    return boneNames.has(nodeName) && !track.name.endsWith(".scale");
  });

  return AnimationUtils.makeClipAdditive(additive, 0, additive, 24);
};

/** 예고 표시가 바닥과 겹쳐 지글거리거나 서로 순서가 뒤바뀌지 않게 함. */
const tuneAoeMesh = (mesh: Mesh): void => {
  const material = mesh.material as Material;

  material.depthWrite = false;
  material.polygonOffset = true;
  material.polygonOffsetFactor = -2;
  material.polygonOffsetUnits = -2;
  // 이름이 "Swipe / 03 …" 꼴이라 번호가 곧 쌓는 순서임.
  mesh.renderOrder = Number.parseInt(mesh.name.match(/_(\d\d)_/)?.[1] ?? "0", 10);
};
// endregion

/**
 * 받은 GLB 를 재생용으로 손봄.
 *
 * 캐시된 씬 그래프를 제자리에서 고침. 보스는 화면에 하나뿐이고 고치는 내용이
 * 멱등이라 사본을 만들지 않았음. 클립은 원본을 두고 사본을 고침.
 */
export const prepareBossModel = ({ scene, animations }: BossGltf): BossModel => {
  const rig = requireNode(scene, BOSS_NODE_NAMES.rig);
  const aoeRoots = Object.values(BOSS_NODE_NAMES.aoe).map((name) => requireNode(scene, name));
  const existingAnchor = scene.getObjectByName(BOSS_NODE_NAMES.aoeAnchor);
  const aoeAnchor = existingAnchor instanceof Group ? existingAnchor : new Group();

  if (!existingAnchor) {
    aoeAnchor.name = BOSS_NODE_NAMES.aoeAnchor;
    scene.add(aoeAnchor);
    for (const aoeRoot of aoeRoots) {
      aoeAnchor.add(aoeRoot);
    }
  }

  const boneNames = new Set<string>();

  scene.traverse((object) => {
    if ((object as Object3D & { isBone?: boolean }).isBone) {
      boneNames.add(object.name);
    }

    if (!isMesh(object)) {
      return;
    }

    if ((object as Mesh & { isSkinnedMesh?: boolean }).isSkinnedMesh) {
      // 경계 구가 기본 자세 기준이라 뒤로 넘어지면(4.6 m) 화면 끝에서 잘림. 한 마리라 그냥 끔.
      object.frustumCulled = false;
      return;
    }

    tuneAoeMesh(object);
  });

  const clips = Object.fromEntries(
    Object.entries(BOSS_CLIP_NAMES).map(([key, name]) => [key, requireClip(animations, name)]),
  ) as Record<BossClipKey, AnimationClip>;

  clips.charge = stripRootMotion(clips.charge);
  clips.hit = toAdditiveHitClip(clips.hit, boneNames);

  return { scene, rig, aoeAnchor, aoeRoots, clips };
};

/** 보스 모델을 받아 손본 결과를 돌려줌. 받는 동안 서스펜드함. */
export const useBossModel = (): BossModel => {
  const gltf = useLoader(GLTFLoader, BOSS_MODEL_URL);

  return useMemo(() => prepareBossModel(gltf), [gltf]);
};
