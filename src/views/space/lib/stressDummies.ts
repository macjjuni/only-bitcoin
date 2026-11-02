import {
  type RemotePlayer,
  SPACE_AVATAR_COLORS,
  SPACE_AVATAR_MODELS,
  SPACE_ISLAND,
} from "@/entities/space";
import { resolveSpaceAvatarCount } from "./avatarCapacity";

/**
 * 개발 전용 더미 아바타.
 *
 * 1단계에는 원격 플레이어가 없지만 50명 렌더 비용은 네트워크 레이어보다 먼저
 * 확정해야 한다. 더미를 원 궤도로 돌려 인스턴싱·명찰 컬링·프레임 예산을 측정한다.
 * 2단계 이후에도 회귀 측정 수단으로 남는다.
 */
export interface StressDummy extends RemotePlayer {
  orbitCenterX: number;
  orbitCenterZ: number;
  orbitRadius: number;
  /** 라디안/초. */
  angularSpeed: number;
  initialAngle: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * 더미를 가두는 광장 반지름.
 *
 * **광장 안으로 묶는다.** 전에는 이동 경계 상자 전체에 뿌렸는데, 섬의 경계
 * 상자는 바다와 무지개 다리까지 포함한 80 × 70 이라 절반이 수평선 근처
 * 바다 위에 떠서 프러스텀 밖으로 빠졌다. 화면에 안 잡히는 아바타는 렌더
 * 비용을 재 주지 않는다.
 *
 * 원형극장 아랫단이 12 m 라 그 바로 앞까지만 쓴다.
 */
const PLAZA_LIMIT_RADIUS = 12;

/**
 * 궤도 **중심**을 뿌리는 반지름.
 *
 * 궤도 반지름이 최대 5.5 m 라 중심을 광장 끝까지 밀면 궤도가 계단을 넘는다.
 */
const ORBIT_CENTER_RADIUS = 7;

/**
 * 더미를 광장에 고르게 뿌린다.
 *
 * 황금각으로 중심을 배치해 궤도가 한곳에 뭉치지 않게 한다. 뭉치면 프레임
 * 측정이 실제보다 좋게 나온다.
 */
export const createStressDummies = (count: number): StressDummy[] => {
  const boundedCount = resolveSpaceAvatarCount(count);
  return Array.from({ length: boundedCount }, (_, seat) => {
    const spiralAngle = seat * GOLDEN_ANGLE;
    const spiralRadius = Math.sqrt((seat + 0.5) / boundedCount);
    const orbitCenterX = Math.cos(spiralAngle) * spiralRadius * ORBIT_CENTER_RADIUS;
    const orbitCenterZ = Math.sin(spiralAngle) * spiralRadius * ORBIT_CENTER_RADIUS;

    return {
      seat,
      // 모델을 번갈아 준다. 한 모델만 띄우면 모델이 둘일 때의 드로우 콜·
      // 삼각형 비용을 측정에서 놓친다.
      modelIndex: seat % SPACE_AVATAR_MODELS.length,
      nickname: `더미${String(seat + 1).padStart(2, "0")}`,
      colorIndex: seat % SPACE_AVATAR_COLORS.length,
      orbitCenterX,
      orbitCenterZ,
      orbitRadius: 1.5 + (seat % 5),
      angularSpeed: 0.35 + (seat % 7) * 0.08,
      initialAngle: spiralAngle,
      x: orbitCenterX,
      z: orbitCenterZ,
      // 광장 바닥에 세운다. 섬은 다층이라 0 은 바다 높이다.
      y: SPACE_ISLAND.plazaY,
      yaw: 0,
    };
  });
};

/**
 * 더미 위치를 경과 시간에 맞춰 갱신한다.
 *
 * 매 프레임 배열을 새로 만들지 않고 제자리에서 바꾼다. 50개를 프레임마다
 * 재할당하면 측정하려는 렌더 비용에 GC 부하가 섞인다.
 */
export const advanceStressDummies = (
  dummies: readonly StressDummy[],
  elapsedSeconds: number,
): void => {
  for (const dummy of dummies) {
    const angle = dummy.initialAngle + elapsedSeconds * dummy.angularSpeed;
    const x = dummy.orbitCenterX + Math.cos(angle) * dummy.orbitRadius;
    const z = dummy.orbitCenterZ + Math.sin(angle) * dummy.orbitRadius;

    // 광장 밖으로 밀려나면 원형극장 계단을 뚫고 선다. 더미는 지형을 보지
    // 않으므로 반지름으로 묶는다.
    const spread = Math.hypot(x, z);
    const fit = spread > PLAZA_LIMIT_RADIUS ? PLAZA_LIMIT_RADIUS / spread : 1;

    dummy.x = x * fit;
    dummy.z = z * fit;
    // 궤도 접선 (-sinθ, cosθ) 을 보게 한다. 전방이 -Z 이므로 yaw = atan2(-dx, -dz) 다.
    dummy.yaw = Math.atan2(Math.sin(angle), -Math.cos(angle));
  }
};
