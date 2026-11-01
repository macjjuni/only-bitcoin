"use client";

import { memo, type ReactNode, useLayoutEffect, useMemo, useRef } from "react";
import { type InstancedMesh, Object3D } from "three";
import { SPACE_GROUND, SPACE_ROOM_HEIGHT } from "@/entities/space";

/**
 * 지하 벙커 외곽.
 *
 * 전광판 벽(`ControlWall`)만 있던 공간에 좌·우·앞 벽과 천장을 더해 방을 닫는다.
 * 사방이 뚫려 있으면 어두운 배경에 떠 있는 플랫폼으로 읽혀, 조명과 소품을
 * 아무리 손봐도 "아지트" 가 되지 않는다.
 *
 * 벽면 장식은 **노출 배관과 케이블 트레이**다. 벙커는 마감된 방이 아니라 설비가
 * 그대로 드러난 공간이고, 긴 박스 몇 개로 그 느낌이 가장 싸게 나온다.
 */

/**
 * 콘크리트 색.
 *
 * 처음 값(`#1a1d21`·`#14171a`)은 빛이 닿지 않는 모서리에서 배경과 구분되지
 * 않았다. 어두운 재질에 약한 빛을 주면 아무리 조명을 더해도 면이 드러나지 않는다.
 * 한 단계 올려 빛이 조금만 닿아도 면으로 읽히게 한다.
 */
const CONCRETE_COLOR = "#24282d";
const CONCRETE_DARK_COLOR = "#1c2024";
const PIPE_COLOR = "#2b2f34";
const TRAY_COLOR = "#23272b";
const EMERGENCY_LIGHT_COLOR = "#ff8a3c";

const roomHalfWidth = SPACE_GROUND.width / 2;
const roomFrontZ = SPACE_GROUND.centerZ + SPACE_GROUND.depth / 2;
const roomDepth = SPACE_GROUND.depth;

interface ShellPart {
  position: [number, number, number];
  size: [number, number, number];
}

// region [Privates]
/** 천장을 가로지르는 배관. 길이를 방 폭에 맞추고 높이만 달리해 겹치지 않게 둔다. */
const ceilingPipeParts: readonly ShellPart[] = [
  { position: [0, SPACE_ROOM_HEIGHT - 0.55, -8], size: [SPACE_GROUND.width, 0.38, 0.38] },
  { position: [0, SPACE_ROOM_HEIGHT - 0.95, -7.3], size: [SPACE_GROUND.width, 0.26, 0.26] },
  { position: [0, SPACE_ROOM_HEIGHT - 0.55, 4], size: [SPACE_GROUND.width, 0.3, 0.3] },
  { position: [0, SPACE_ROOM_HEIGHT - 0.5, 10], size: [SPACE_GROUND.width, 0.22, 0.22] },
];

/** 좌우 벽을 따라 흐르는 케이블 트레이. 벽에 붙여 바닥 쪽 시선을 끌지 않는다. */
const cableTrayParts: readonly ShellPart[] = [-1, 1].flatMap((side) => [
  {
    position: [side * (roomHalfWidth - 0.22), 6.4, SPACE_GROUND.centerZ],
    size: [0.36, 0.3, roomDepth - 1],
  },
  {
    position: [side * (roomHalfWidth - 0.22), 5.9, SPACE_GROUND.centerZ],
    size: [0.28, 0.2, roomDepth - 1],
  },
]);

/** 벽을 세로로 긁는 구조 리브. 콘크리트 면이 밋밋하게 비는 것을 막는다. */
const wallRibParts: readonly ShellPart[] = [-1, 1].flatMap((side) =>
  [-14, -6, 2, 10].map(
    (positionZ): ShellPart => ({
      position: [side * (roomHalfWidth - 0.12), SPACE_ROOM_HEIGHT / 2, positionZ],
      size: [0.24, SPACE_ROOM_HEIGHT - 0.4, 0.5],
    }),
  ),
);

/**
 * 주황 비상등.
 *
 * 벙커에서 가장 값싸게 분위기를 만드는 요소다. 실제 조명은 `SceneLighting` 의
 * 펜던트 광원이 담당하고, 이 박스는 "빛나는 기구" 로만 보이게 한다.
 */
const emergencyLightParts: readonly ShellPart[] = [-1, 1].flatMap((side) =>
  [-12, -2, 8].map(
    (positionZ): ShellPart => ({
      position: [side * (roomHalfWidth - 0.34), 7.6, positionZ],
      size: [0.18, 0.5, 0.5],
    }),
  ),
);
// endregion

interface InstancedShellPartsProps {
  parts: readonly ShellPart[];
  children: ReactNode;
}

/** 정적 부품은 초기 배치 때만 행렬을 전송한다. 프레임 갱신을 두지 않는다. */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function InstancedShellParts({ parts, children }: InstancedShellPartsProps): ReactNode {
  // region [Hooks]
  const meshRef = useRef<InstancedMesh>(null);
  const placeholder = useMemo(() => new Object3D(), []);
  // endregion


  // region [Life Cycles]
  useLayoutEffect(() => {
    const mesh = meshRef.current;

    if (!mesh) {
      return;
    }

    parts.forEach((part, index) => {
      placeholder.position.set(...part.position);
      placeholder.scale.set(...part.size);
      placeholder.updateMatrix();
      mesh.setMatrixAt(index, placeholder.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, [parts, placeholder]);
  // endregion

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, parts.length]}>
      <boxGeometry args={[1, 1, 1]} />
      {children}
    </instancedMesh>
  );
}

function BunkerShell(): ReactNode {
  return (
    <>
      {/* 좌우 벽. 안쪽을 보도록 돌린다. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * roomHalfWidth, SPACE_ROOM_HEIGHT / 2, SPACE_GROUND.centerZ]}
          rotation={[0, (side * -Math.PI) / 2, 0]}
        >
          <planeGeometry args={[roomDepth, SPACE_ROOM_HEIGHT]} />
          <meshStandardMaterial color={CONCRETE_COLOR} roughness={0.95} metalness={0.05} />
        </mesh>
      ))}

      {/* 앞벽. 플레이어 등 뒤라 거의 보이지 않지만, 없으면 뒤돌 때 허공이 뜬다. */}
      <mesh position={[0, SPACE_ROOM_HEIGHT / 2, roomFrontZ]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[SPACE_GROUND.width, SPACE_ROOM_HEIGHT]} />
        <meshStandardMaterial color={CONCRETE_DARK_COLOR} roughness={0.95} metalness={0.05} />
      </mesh>

      {/* 천장. 아래를 보도록 돌린다. */}
      <mesh position={[0, SPACE_ROOM_HEIGHT, SPACE_GROUND.centerZ]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SPACE_GROUND.width, roomDepth]} />
        <meshStandardMaterial color={CONCRETE_DARK_COLOR} roughness={0.98} metalness={0.04} />
      </mesh>

      <InstancedShellParts parts={wallRibParts}>
        <meshStandardMaterial color={CONCRETE_DARK_COLOR} roughness={0.9} metalness={0.1} />
      </InstancedShellParts>

      <InstancedShellParts parts={ceilingPipeParts}>
        <meshStandardMaterial color={PIPE_COLOR} roughness={0.62} metalness={0.55} />
      </InstancedShellParts>

      <InstancedShellParts parts={cableTrayParts}>
        <meshStandardMaterial color={TRAY_COLOR} roughness={0.7} metalness={0.45} />
      </InstancedShellParts>

      {/* 발광 재질이라 조명과 무관하게 같은 밝기로 빛난다. */}
      <InstancedShellParts parts={emergencyLightParts}>
        <meshBasicMaterial color={EMERGENCY_LIGHT_COLOR} toneMapped={false} />
      </InstancedShellParts>
    </>
  );
}

const MemoizedBunkerShell = memo(BunkerShell);
MemoizedBunkerShell.displayName = "BunkerShell";

export default MemoizedBunkerShell;
