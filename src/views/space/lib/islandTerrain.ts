import { Box3, type BufferGeometry, DoubleSide, FrontSide, Line3, Ray, Vector3 } from "three";
import { type ExtendedTriangle, MeshBVH } from "three-mesh-bvh";
import {
  SPACE_AVATAR_COLLISION_HEIGHT,
  SPACE_AVATAR_COLLISION_RADIUS,
  SPACE_STEP_HEIGHT,
  type SpaceTerrain,
  type TerrainMoveResult,
} from "@/entities/space";
import type { Vector3Like } from "@/features/space-controls";

/**
 * 충돌 메시(`Collision`, 약 2.7만 tri)에 BVH 를 씌운 지형 질의.
 *
 * 질의는 세 가지뿐이다 — 발밑 높이, 수평 벽, 머리 위 천장. 셋 다 BVH 한 번
 * 조회로 끝나므로 고정 타임스텝(초당 60회)에서도 가볍다.
 *
 * **높이와 수평을 분리**한 이유는 계단이다. 맵의 계단 한 칸은 복셀 한 칸
 * (0.25 m)이고, 캡슐로 수평까지 함께 보면 계단마다 턱에 걸린다. 캡슐 아랫점을
 * 오를 수 있는 턱(`SPACE_STEP_HEIGHT`) 위에서 시작해 낮은 턱은 **아예 보지
 * 않게** 하고, 올라서는 일은 발밑 레이캐스트가 처리한다.
 */

/** 발밑을 훑는 거리(m). 궁전 단(11)에서 바다(0)까지 떨어져도 남는 길이다. */
const GROUND_PROBE_DISTANCE = 60;

/** 머리 위를 훑는 거리(m). 이보다 높으면 하늘이라 봐도 소용없다. */
const CEILING_PROBE_DISTANCE = 6;

/**
 * 천장 레이를 띄우는 높이.
 *
 * 발바닥에서 바로 쏘면 서 있는 바닥면을 스쳐 맞을 수 있다. 오를 수 있는 턱
 * 위에서 시작하면 그 아래 지형은 보지 않는다.
 */
const CEILING_PROBE_ORIGIN_OFFSET = SPACE_STEP_HEIGHT;

/** 밀려난 거리가 이보다 작으면 벽에 닿지 않은 것으로 본다. 부동소수점 잡음. */
const PUSH_EPSILON = 1e-4;

/**
 * 한 번의 `resolveMove` 에서 되밀어내는 횟수 상한.
 *
 * 벽 두 개가 만나는 안쪽 모서리에서는 한쪽을 풀면 다른 쪽을 파고든다. 몇 번
 * 반복하면 수렴하지만, 아바타 지름보다 좁은 틈에서는 영원히 번갈아 밀리므로
 * 상한을 둔다.
 */
const MAX_DEPENETRATION_PASSES = 3;

// region [Privates]
/** 매 스텝 새로 만들지 않도록 모듈 수준에 둔다. 질의는 항상 한 스레드에서 돈다. */
const scratch = {
  ray: new Ray(),
  segment: new Line3(),
  capsuleBox: new Box3(),
  triangleClosest: new Vector3(),
  capsuleClosest: new Vector3(),
  pushDirection: new Vector3(),
  origin: new Vector3(),
};

const DOWN = new Vector3(0, -1, 0);
const UP = new Vector3(0, 1, 0);

/**
 * 캡슐을 삼각형 밖으로 밀어내되 **수평 성분만** 쓴다.
 *
 * 수직 성분까지 반영하면 비탈면이 캡슐을 들어 올려 걸어 올라가는 것처럼 되는데,
 * 높이는 발밑 레이캐스트가 정하므로 두 곳에서 같은 일을 하게 된다. 바닥·천장
 * 처럼 법선이 거의 수직인 면은 수평 성분이 0 이라 그대로 건너뛴다.
 */
const pushCapsuleOutOfTriangle = (triangle: ExtendedTriangle, radius: number): boolean => {
  const { segment, triangleClosest, capsuleClosest, pushDirection } = scratch;
  const distance = triangle.closestPointToSegment(segment, triangleClosest, capsuleClosest);

  if (distance >= radius) {
    return false;
  }

  pushDirection.subVectors(capsuleClosest, triangleClosest).setY(0);

  const horizontalLength = pushDirection.length();

  if (horizontalLength < PUSH_EPSILON) {
    return false;
  }

  pushDirection.divideScalar(horizontalLength);

  // 수평으로 t 만큼 밀었을 때 떨어지는 거리를 반지름과 맞추는 t 를 푼다.
  // |(C−T) + t·h|² = d² + 2t·hl + t² = r² 에서
  //   t = −hl + √(hl² − d² + r²)
  // 접촉이 수평에 가까우면(hl ≈ d) 익숙한 `r − d` 로 수렴한다. 비스듬한 면은
  // 수평 성분이 짧은 만큼 더 멀리 밀어야 같은 깊이가 풀린다.
  const separation = horizontalLength * horizontalLength - distance * distance + radius * radius;
  const depth = -horizontalLength + Math.sqrt(separation);

  segment.start.addScaledVector(pushDirection, depth);
  segment.end.addScaledVector(pushDirection, depth);

  return true;
};
// endregion

export interface IslandTerrain extends SpaceTerrain {
  /** 지형을 파고들지 않는 카메라 위치. 주시점 쪽으로 당겨서 돌려준다. */
  resolveCameraPosition(focus: Vector3Like, camera: Vector3Like, margin: number): Vector3Like;
}

/**
 * 충돌 지오메트리로 지형 질의를 만든다.
 *
 * `geometry` 는 GLB 의 `Collision` 메시다. 그 노드에는 변환이 없어 지오메트리
 * 좌표가 곧 월드 좌표라, 매 질의마다 행렬을 곱하지 않아도 된다.
 */
export const createIslandTerrain = (geometry: BufferGeometry): IslandTerrain => {
  const bvh = new MeshBVH(geometry);

  /**
   * 발이 닿는 높이.
   *
   * 오를 수 있는 턱 위에서 아래로 쏜다. 위에서 쏘면 머리 위 아치나 다리
   * 상판을 지면으로 잡아 그 밑을 지나갈 수 없다.
   *
   * `FrontSide` 로 **위를 보는 면만** 맞춘다. 아래로 가는 레이는 상향면의
   * 앞면과 하향면의 뒷면을 만나는데, 하향면(천장·처마 밑)을 지면으로 쓰면
   * 발이 천장에 붙는다.
   */
  const resolveGroundY = (x: number, z: number, feetY: number): number => {
    const { ray, origin } = scratch;

    origin.set(x, feetY + SPACE_STEP_HEIGHT, z);
    ray.set(origin, DOWN);

    const hit = bvh.raycastFirst(ray, FrontSide, 0, GROUND_PROBE_DISTANCE);

    // 아래에 아무것도 없으면 열린 바다다. 수면을 바닥으로 돌려주면 그 위를
    // 걸어다니게 되고, 섬 가장자리가 5 m 절벽이라 돌아올 수도 없다.
    return hit ? hit.point.y : Number.NEGATIVE_INFINITY;
  };

  /**
   * 수평 충돌.
   *
   * 캡슐 아랫점을 `feetY + 오를 수 있는 턱 + 반지름` 에 둔다. 그보다 낮은
   * 것(계단 한 칸, 광장 문양 테두리)은 캡슐이 아예 만나지 않아 걸리지 않는다.
   */
  const resolveMove = (x: number, z: number, feetY: number): TerrainMoveResult => {
    const { segment, capsuleBox } = scratch;
    const radius = SPACE_AVATAR_COLLISION_RADIUS;
    const bottomY = feetY + SPACE_STEP_HEIGHT + radius;
    const topY = feetY + SPACE_AVATAR_COLLISION_HEIGHT - radius;

    segment.start.set(x, bottomY, z);
    segment.end.set(x, Math.max(topY, bottomY), z);

    for (let pass = 0; pass < MAX_DEPENETRATION_PASSES; pass += 1) {
      capsuleBox.setFromPoints([segment.start, segment.end]).expandByScalar(radius);

      let hasPushed = false;

      bvh.shapecast({
        intersectsBounds: (bounds) => bounds.intersectsBox(capsuleBox),
        intersectsTriangle: (triangle) => {
          hasPushed = pushCapsuleOutOfTriangle(triangle, radius) || hasPushed;
        },
      });

      if (!hasPushed) {
        break;
      }
    }

    const deltaX = segment.start.x - x;
    const deltaZ = segment.start.z - z;
    const pushLength = Math.hypot(deltaX, deltaZ);

    if (pushLength < PUSH_EPSILON) {
      return { x, z, pushX: 0, pushZ: 0 };
    }

    return {
      x: segment.start.x,
      z: segment.start.z,
      pushX: deltaX / pushLength,
      pushZ: deltaZ / pushLength,
    };
  };

  /**
   * 머리가 닿는 높이에서 역산한 **발바닥 상한**.
   *
   * `FrontSide` 로 아래를 보는 면만 맞춘다. 위로 가는 레이가 상향면의 뒷면까지
   * 세면 서 있는 바닥 자체가 천장이 된다.
   */
  const resolveCeilingY = (x: number, z: number, feetY: number): number => {
    const { ray, origin } = scratch;

    origin.set(x, feetY + CEILING_PROBE_ORIGIN_OFFSET, z);
    ray.set(origin, UP);

    const hit = bvh.raycastFirst(ray, FrontSide, 0, CEILING_PROBE_DISTANCE);

    if (!hit) {
      return Number.POSITIVE_INFINITY;
    }

    // 이미 천장에 끼어 있으면 현재 높이를 상한으로 둔다. 더 낮은 값을 주면
    // 바닥 밑으로 끌려 내려간다.
    return Math.max(hit.point.y - SPACE_AVATAR_COLLISION_HEIGHT, feetY);
  };

  /**
   * 카메라가 지형을 파고들지 않도록 주시점 쪽으로 당긴다.
   *
   * 3인칭 카메라는 플레이어 뒤에 있어서, 벽을 등지거나 계단 아래에 서면 카메라가
   * 지형 안으로 들어간다. 벙커에서는 방이 사각형이라 상자 클램프로 충분했지만
   * 섬은 언덕·성벽·아치가 사방에 있어 상자로는 못 막는다.
   *
   * 주시점에서 카메라 쪽으로 레이를 쏴, 먼저 맞은 지점보다 `margin` 만큼
   * 앞에 세운다. 양면(`DoubleSide`)을 보는 이유는 충돌 메시가 닫힌 입체가
   * 아니어서다 — 벽 안쪽에서 나가는 레이는 뒷면을 먼저 만난다.
   */
  const resolveCameraPosition = (
    focus: Vector3Like,
    camera: Vector3Like,
    margin: number,
  ): Vector3Like => {
    const { ray, origin, pushDirection } = scratch;

    pushDirection.set(camera.x - focus.x, camera.y - focus.y, camera.z - focus.z);

    const distance = pushDirection.length();

    if (distance < PUSH_EPSILON) {
      return camera;
    }

    pushDirection.divideScalar(distance);
    origin.set(focus.x, focus.y, focus.z);
    ray.set(origin, pushDirection);

    const hit = bvh.raycastFirst(ray, DoubleSide, 0, distance);

    if (!hit) {
      return camera;
    }

    const safeDistance = Math.max(hit.distance - margin, 0);

    return {
      x: focus.x + pushDirection.x * safeDistance,
      y: focus.y + pushDirection.y * safeDistance,
      z: focus.z + pushDirection.z * safeDistance,
    };
  };

  return { resolveGroundY, resolveMove, resolveCeilingY, resolveCameraPosition };
};
