import { useLoader } from "@react-three/fiber";
import { useMemo } from "react";
import type { AnimationClip, Group } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { toVersionedModelUrl } from "./modelAssetUrl";

/**
 * 바리스타 NPC 모델 로더.
 *
 * 유저 아바타는 구운 프레임과 `InstancedMesh` 로 그리지만 바리스타는 한 명이라 보스처럼
 * 스킨 메시와 `AnimationMixer` 를 그대로 씀. 텍스처 없이 정점 색으로 칠한 모델임.
 */

/** 빌드 때 파일 해시를 붙임. 에셋을 다시 구우면 주소가 바뀌어 캐시를 건너뜀. */
export const BARISTA_MODEL_URL = toVersionedModelUrl("/models/barista-skirt.glb");

/** GLB 클립 이름. 굽는 쪽과 **같은 문자열**이어야 함. */
export const BARISTA_IDLE_CLIP_NAME = "Idle";

/**
 * 손짓하는 쪽 팔의 뼈 이름. three 가 `.` 을 지운 뒤의 이름임.
 *
 * 대기 모션은 숨 쉬는 동안 오른팔을 한 번 들어 올림. 이 뼈들만 멈추면 숨만 쉬는 모션이 됨.
 */
const BARISTA_GESTURE_BONE_NAMES: ReadonlySet<string> = new Set([
  "upper_armR",
  "forearmR",
  "handR",
]);

export interface BaristaModel {
  /** 씬 그래프 전체. `<primitive>` 로 붙임. 믹서도 이걸 뿌리로 씀. */
  scene: Group;
  /** 서서 숨 쉬다가 오른팔로 손짓을 한 번 하는 모션. 6초. */
  idleClip: AnimationClip;
  /**
   * 손짓 없이 숨만 쉬는 모션. `idleClip` 과 길이·박자가 같아 한 바퀴가 끝날 때 바꿔 틀어도 안 튐.
   *
   * 에셋에는 모션이 하나뿐이라 6초마다 손짓을 되풀이함. 사이사이 이걸 틀어 손짓을 뜸하게 함.
   */
  restClip: AnimationClip;
}

interface BaristaGltf {
  scene: Group;
  animations: AnimationClip[];
}

/**
 * 손짓하는 팔만 첫 자세에 멈춰 둔 사본을 만듦.
 *
 * 트랙을 지우지 않고 첫 키로 채움. 지우면 그 뼈가 기본 자세로 돌아가는데, 모션의 첫 자세와
 * 기본 자세가 같다는 보장이 없음.
 */
const toRestClip = (clip: AnimationClip): AnimationClip => {
  const rest = clip.clone();

  rest.name = `${clip.name}_Rest`;
  rest.tracks = rest.tracks.map((track) => {
    const boneName = track.name.slice(0, track.name.lastIndexOf("."));

    if (!BARISTA_GESTURE_BONE_NAMES.has(boneName)) {
      return track;
    }

    const firstKey = track.values.slice(0, track.getValueSize());
    const held = track.clone();

    held.times = Float32Array.of(0, clip.duration);
    held.values = Float32Array.of(...firstKey, ...firstKey);

    return held;
  });

  return rest;
};

/** 받은 GLB 에서 그릴 것과 틀 모션을 꺼냄. */
export const prepareBaristaModel = ({ scene, animations }: BaristaGltf): BaristaModel => {
  const idleClip = animations.find((clip) => clip.name === BARISTA_IDLE_CLIP_NAME);

  if (!idleClip) {
    throw new Error(
      `바리스타 GLB 에 '${BARISTA_IDLE_CLIP_NAME}' 모션이 없습니다. 에셋이 바뀌었는지 확인하세요.`,
    );
  }

  return { scene, idleClip, restClip: toRestClip(idleClip) };
};

/** 바리스타 모델을 받아 돌려줌. 받는 동안 서스펜드함. */
export const useBaristaModel = (): BaristaModel => {
  const gltf = useLoader(GLTFLoader, BARISTA_MODEL_URL);

  return useMemo(() => prepareBaristaModel(gltf), [gltf]);
};
