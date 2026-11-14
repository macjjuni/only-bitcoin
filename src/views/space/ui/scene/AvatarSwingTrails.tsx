"use client";

import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, type RefObject, useEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from "three";
import {
  type PlayerTransform,
  type RemotePlayer,
  resolveAvatarCombat,
  resolveAvatarModel,
} from "@/entities/space";
import {
  resolveSwingTrailPose,
  resolveSwingTrailStyleById,
  SWING_TRAIL_STYLE_IDS,
  type SwingTrailStyle,
} from "@/views/space/lib/swingTrail";

/** 동시에 그리는 궤적 수. 넘치면 뒤에 온 것은 안 그림. 여럿이 같은 순간에 휘두를 때만 참. */
const TRAIL_SLOT_COUNT = 8;
const TRAIL_SEGMENTS = 20;
/** 톱니 하나가 바깥으로 튀어나오는 길이(m). */
const TRAIL_SPIKE_LENGTH = 0.14;
const TRAIL_OPACITY = 0.9;

interface AvatarSwingTrailsProps {
  /** 내 자리. 매 프레임 바뀌어서 ref 로 받음. */
  selfTransformRef: RefObject<PlayerTransform>;
  selfModelIndex: number;
  /** 내가 공격을 시작한 시각. 한 번도 안 했으면 `undefined`. */
  selfKickStartedAtRef: RefObject<number | undefined>;
  /** 남의 자리. 같은 배열을 제자리에서 고쳐 넘기므로 `useFrame` 안에서만 읽음. */
  remotePlayers: readonly RemotePlayer[];
  /** 좌석별 공격 시작 시각. */
  remoteKickStartsRef: RefObject<Map<number, number>>;
}

// region [Privates]
/**
 * 궤적 한 줄. 머리가 앞(−Z)이고 꼬리가 오른쪽으로 휘어 남음.
 *
 * 수평면(XZ)에 그림. 머리 쪽이 굵고 꼬리로 갈수록 가늘어짐.
 */
const createTrailGeometry = (style: SwingTrailStyle): BufferGeometry => {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let segment = 0; segment <= TRAIL_SEGMENTS; segment += 1) {
    const ratio = segment / TRAIL_SEGMENTS;
    const angle = ratio * style.arcAngle;
    // 머리 끝은 둥글게 닫고 꼬리는 길게 뺌.
    const halfWidth = style.halfWidth * (1 - ratio) ** 1.3 * Math.min(1, ratio * 8);
    const spike = style.isJagged && segment % 2 === 1 ? TRAIL_SPIKE_LENGTH * (1 - ratio) : 0;

    for (const edgeRadius of [style.radius - halfWidth, style.radius + halfWidth + spike]) {
      positions.push(Math.sin(angle) * edgeRadius, 0, -Math.cos(angle) * edgeRadius);
    }
    if (segment < TRAIL_SEGMENTS) {
      const vertexIndex = segment * 2;

      indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
      indices.push(vertexIndex + 1, vertexIndex + 3, vertexIndex + 2);
    }
  }

  const geometry = new BufferGeometry();

  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);

  return geometry;
};
// endregion

/**
 * 무기를 휘두를 때 남는 궤적. 나와 남의 것을 같이 그림.
 *
 * 궤적은 공격 시작 시각만으로 구해서 따로 기억해 두는 상태가 없음. 매 프레임 지금
 * 휘두르는 사람을 훑어 빈 칸에 차례로 놓음. 메시는 미리 만들어 두고 돌려 씀.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function AvatarSwingTrails({ selfTransformRef, selfModelIndex, selfKickStartedAtRef, remotePlayers, remoteKickStartsRef }: AvatarSwingTrailsProps): ReactNode {
  // region [Hooks]
  const geometries = useMemo(() => {
    return SWING_TRAIL_STYLE_IDS.map((modelId) => {
      const style = resolveSwingTrailStyleById(modelId);

      return style ? createTrailGeometry(style) : new BufferGeometry();
    });
  }, []);
  const slotGroupsRef = useRef<(Group | null)[]>([]);
  const tiltGroupsRef = useRef<(Group | null)[]>([]);
  /** 칸마다 무기별 메시가 하나씩 있음. `[칸][무기]` 순서임. */
  const trailMeshesRef = useRef<(Mesh | null)[][]>(
    Array.from({ length: TRAIL_SLOT_COUNT }, () => []),
  );
  // endregion


  // region [Privates]
  const hideSlot = (slot: number): void => {
    const slotGroup = slotGroupsRef.current[slot];

    if (slotGroup) {
      slotGroup.visible = false;
    }
  };

  /**
   * 한 사람의 궤적을 칸에 놓음.
   *
   * @returns 그렸으면 `true`. 궤적이 없는 캐릭터거나 지금 보일 때가 아니면 `false`.
   */
  const placeTrail = (
    slot: number,
    transform: PlayerTransform,
    modelIndex: number,
    startedAt: number,
    now: number,
  ): boolean => {
    const slotGroup = slotGroupsRef.current[slot];
    const tiltGroup = tiltGroupsRef.current[slot];
    const modelId = resolveAvatarModel(modelIndex).id;
    const styleIndex = SWING_TRAIL_STYLE_IDS.indexOf(modelId);
    const style = resolveSwingTrailStyleById(modelId);

    if (!slotGroup || !tiltGroup || !style || styleIndex < 0) {
      return false;
    }

    const { attackSeconds } = resolveAvatarCombat(modelIndex);
    const pose = resolveSwingTrailPose(style, attackSeconds, (now - startedAt) / 1000);

    if (!pose) {
      return false;
    }

    slotGroup.visible = true;
    slotGroup.position.set(transform.x, transform.y + style.centerHeight, transform.z);
    slotGroup.rotation.set(0, transform.yaw, 0);
    // 앞이 −Z 라 앞으로 벗어난 만큼은 부호를 뒤집음.
    tiltGroup.position.set(style.centerRight, 0, -style.centerForward);
    tiltGroup.rotation.set(0, 0, style.tiltAngle);

    trailMeshesRef.current[slot].forEach((mesh, meshIndex) => {
      if (!mesh) {
        return;
      }

      mesh.visible = meshIndex === styleIndex;

      if (!mesh.visible) {
        return;
      }

      // 머리 방향은 오른쪽이 + 인데 Y축 회전은 왼쪽이 + 라 부호를 뒤집음.
      mesh.rotation.set(0, -pose.headAngle, 0);
      mesh.scale.setScalar(pose.scale);
      (mesh.material as MeshBasicMaterial).opacity = pose.opacity * TRAIL_OPACITY;
    });

    return true;
  };
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    return () => {
      for (const geometry of geometries) {
        geometry.dispose();
      }
    };
  }, [geometries]);

  useFrame(() => {
    const now = performance.now();
    const selfKickStartedAt = selfKickStartedAtRef.current;
    let slot = 0;

    if (
      selfKickStartedAt !== undefined &&
      placeTrail(slot, selfTransformRef.current, selfModelIndex, selfKickStartedAt, now)
    ) {
      slot += 1;
    }

    for (const [seat, startedAt] of remoteKickStartsRef.current) {
      if (slot >= TRAIL_SLOT_COUNT) {
        break;
      }

      const player = remotePlayers.find((candidate) => candidate.seat === seat);

      if (player && placeTrail(slot, player, player.modelIndex, startedAt, now)) {
        slot += 1;
      }
    }

    for (let emptySlot = slot; emptySlot < TRAIL_SLOT_COUNT; emptySlot += 1) {
      hideSlot(emptySlot);
    }
  });
  // endregion

  return (
    <>
      {Array.from({ length: TRAIL_SLOT_COUNT }, (_, slot) => (
        <group
          key={slot}
          ref={(group) => {
            slotGroupsRef.current[slot] = group;
          }}
          visible={false}
        >
          <group
            ref={(group) => {
              tiltGroupsRef.current[slot] = group;
            }}
          >
            {SWING_TRAIL_STYLE_IDS.map((modelId, styleIndex) => (
              <mesh
                key={modelId}
                ref={(mesh) => {
                  trailMeshesRef.current[slot][styleIndex] = mesh;
                }}
                geometry={geometries[styleIndex]}
                renderOrder={4}
                frustumCulled={false}
                visible={false}
              >
                <meshBasicMaterial
                  color={resolveSwingTrailStyleById(modelId)?.color}
                  transparent
                  depthWrite={false}
                  side={DoubleSide}
                />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </>
  );
}

const MemoizedAvatarSwingTrails = memo(AvatarSwingTrails);
MemoizedAvatarSwingTrails.displayName = "AvatarSwingTrails";

export default MemoizedAvatarSwingTrails;
