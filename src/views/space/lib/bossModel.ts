import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import {
  type AnimationClip,
  AnimationUtils,
  Group,
  type Material,
  type Mesh,
  MeshBasicMaterial,
  type MeshStandardMaterial,
  type Object3D,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SPACE_BOSS, type SpaceBossAttack } from "@/entities/space";
import { isAndroidDevice, isIOSDevice } from "@/shared/utils/device";
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
  spin: "Spin",
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
  aoe: { swipe: "AOE_Swipe", slam: "AOE_Slam", charge: "AOE_Charge", spin: "AOE_Spin" },
  aoeAnchor: "Boss_AOE_Anchor",
} as const satisfies {
  rig: string;
  rootBone: string;
  aoe: Record<SpaceBossAttack, string>;
  aoeAnchor: string;
};

/** 돌진 띠의 길이만 되돌리려고 끼우는 그룹의 이름. 에셋에는 없고 로더가 만듦. */
const BOSS_CHARGE_LENGTH_NODE_NAME = "Boss_AOE_Charge_Length";

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

/**
 * 예고 재질을 조명 계산이 없는 가벼운 재질로 바꿈. 모바일에서만 씀.
 *
 * 원본은 PBR 반투명 양면이라 겹마다 앞뒤로 두 번 그림. 내려찍기 원은 다섯 겹이 화면을
 * 거의 덮어서 폰에서는 예고가 뜨는 동안 프레임이 떨어졌음. 색은 바탕색에 자체 발광을
 * 더해 비슷하게 맞추고 한 번에 그림.
 */
const toLightweightAoeMaterial = (
  material: Material,
  converted: Map<Material, MeshBasicMaterial>,
): Material => {
  if ((material as MeshBasicMaterial).isMeshBasicMaterial) {
    return material;
  }

  const existing = converted.get(material);

  if (existing) {
    return existing;
  }

  const source = material as MeshStandardMaterial;
  const lightweight = new MeshBasicMaterial({
    name: source.name,
    color: source.color.clone().add(source.emissive),
    opacity: source.opacity,
    transparent: source.transparent,
    side: source.side,
  });

  lightweight.forceSinglePass = true;
  converted.set(material, lightweight);

  return lightweight;
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
export const prepareBossModel = (
  { scene, animations }: BossGltf,
  isLightweightAoe = false,
): BossModel => {
  const rig = requireNode(scene, BOSS_NODE_NAMES.rig);

  // 몸을 키움. 바닥 예고(`aoeAnchor`)는 따로 붙어 있어서 아래에서 같은 배율로 키움.
  rig.scale.setScalar(SPACE_BOSS.modelScale);

  const aoeRoots = Object.values(BOSS_NODE_NAMES.aoe).map((name) => requireNode(scene, name));
  const existingAnchor = scene.getObjectByName(BOSS_NODE_NAMES.aoeAnchor);
  const aoeAnchor = existingAnchor instanceof Group ? existingAnchor : new Group();

  if (!existingAnchor) {
    aoeAnchor.name = BOSS_NODE_NAMES.aoeAnchor;
    scene.add(aoeAnchor);
    for (const aoeRoot of aoeRoots) {
      aoeAnchor.add(aoeRoot);
    }

    // 돌진 띠는 길이만 원래대로 둠(판정 길이에 배율을 안 곱함). 띠 노드의 크기는 모션이 직접
    // 넣어서 못 고치므로, 띠가 시작하는 자리에 그룹을 하나 끼워 길이 방향만 되돌림.
    const chargeRoot = requireNode(scene, BOSS_NODE_NAMES.aoe.charge);
    const chargeLength = new Group();

    chargeLength.name = BOSS_CHARGE_LENGTH_NODE_NAME;
    chargeLength.position.copy(chargeRoot.position);
    chargeLength.scale.set(1, 1, 1 / SPACE_BOSS.modelScale);
    chargeRoot.position.set(0, 0, 0);
    aoeAnchor.add(chargeLength);
    chargeLength.add(chargeRoot);
  }

  // 예고 표시와 그 앞쪽 거리(내려찍기 · 돌진의 `forwardOffset`)가 판정 범위와 같이 커짐.
  // 돌진 띠의 길이만 위에서 끼운 그룹이 되돌림.
  aoeAnchor.scale.setScalar(SPACE_BOSS.modelScale);

  const boneNames = new Set<string>();
  const lightweightMaterials = new Map<Material, MeshBasicMaterial>();

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

    if (isLightweightAoe) {
      object.material = toLightweightAoeMaterial(object.material as Material, lightweightMaterials);
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

  return useMemo(() => prepareBossModel(gltf, isIOSDevice() || isAndroidDevice()), [gltf]);
};
