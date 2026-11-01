"use client";

import { memo, type ReactNode, useLayoutEffect, useMemo, useRef } from "react";
import { type InstancedMesh, Object3D } from "three";
import { SPACE_GROUND, SPACE_LOUNGE } from "@/entities/space";

/**
 * 벙커 소품.
 *
 * 사람 말고 아무것도 없는 방은 아지트로 읽히지 않는다. 복셀 캐릭터와 같은 어휘로
 * 박스만 조합해 채우고, 재질별로 `InstancedMesh` 에 담아 드로우 콜을 3개로 묶는다.
 *
 * **아바타는 소품을 통과한다.** 공간에 충돌 판정이 없기 때문이다(§1). 그래서
 * 소품은 벽 쪽과 코너에 붙이고 중앙 통로는 비워 둔다. 러그 위의 낮은 테이블만
 * 예외로 두는데, 테이블은 넘어 다니는 물건이라 통과가 덜 어색하다.
 */

const METAL_COLOR = "#262b31";
const CRATE_COLOR = "#3b3027";
const SCREEN_COLOR = "#2ee6a8";

const roomHalfWidth = SPACE_GROUND.width / 2;

interface PropPart {
  position: [number, number, number];
  size: [number, number, number];
}

// region [Privates]
/** 뒷벽 양 끝 서버 랙. 전광판 아래는 비워 두고 코너만 채운다. */
const serverRackParts: readonly PropPart[] = [-1, 1].flatMap((side) =>
  [0, 1.4, 2.8].map(
    (offsetX): PropPart => ({
      position: [side * (roomHalfWidth - 2.2) - side * offsetX, 1.1, -16.6],
      size: [1.2, 2.2, 0.95],
    }),
  ),
);

/** 랙 앞면 상태 화면. 랙보다 살짝 앞으로 내 발광 재질로 그린다. */
const rackScreenParts: readonly PropPart[] = serverRackParts.map((rack) => ({
  position: [rack.position[0], 1.75, rack.position[2] + 0.5],
  size: [0.72, 0.4, 0.04],
}));

/** 좌우 벽 선반과 적재 상자. 벽에 붙여 통로를 막지 않는다. */
const shelfParts: readonly PropPart[] = [-1, 1].flatMap((side) =>
  [-8, 2].flatMap((centerZ): PropPart[] => [
    {
      position: [side * (roomHalfWidth - 0.7), 1.3, centerZ],
      size: [1.1, 0.12, 4.2],
    },
    {
      position: [side * (roomHalfWidth - 0.7), 2.5, centerZ],
      size: [1.1, 0.12, 4.2],
    },
    {
      position: [side * (roomHalfWidth - 0.7), 0.06, centerZ],
      size: [1.2, 0.12, 4.4],
    },
  ]),
);

const crateParts: readonly PropPart[] = [-1, 1].flatMap((side) => [
  { position: [side * (roomHalfWidth - 0.8), 1.75, -9.2], size: [0.8, 0.8, 0.8] },
  { position: [side * (roomHalfWidth - 0.8), 1.7, -7], size: [0.7, 0.7, 0.9] },
  { position: [side * (roomHalfWidth - 0.8), 0.52, 3.4], size: [0.9, 0.9, 1.1] },
  { position: [side * (roomHalfWidth - 1.6), 0.45, 11], size: [0.9, 0.9, 0.9] },
  { position: [side * (roomHalfWidth - 1.5), 1.25, 11.2], size: [0.7, 0.7, 0.7] },
]);

/**
 * 러그 중앙의 낮은 테이블과 **러그 둘레**의 드럼통 의자.
 *
 * 좌표는 `SPACE_LOUNGE` 중심에서 잰다. 러그만 옮겼을 때 의자가 허공에 남는 것을
 * 막는다.
 *
 * 의자는 러그의 **전광판 반대쪽**(앞쪽) 둘레에 모았다. 벽 쪽에 두면 패널과 러그
 * 사이 통로를 막아, 전광판을 보러 가는 길에 의자를 비켜 돌아야 한다. 앞쪽에 두면
 * 앉은 사람이 패널을 마주 보는 배치가 되고 통로도 열린다.
 *
 * 같은 좌표가 `entities/space/model/spaceObstacles.ts` 의 충돌 사각형에도 있다.
 * 둘이 어긋나면 보이는 곳과 막히는 곳이 달라진다.
 */
const loungeMetalParts: readonly PropPart[] = [
  { position: [0, 0.26, SPACE_LOUNGE.centerZ], size: [2.6, 0.52, 1.5] },
  { position: [-7.5, 0.45, SPACE_LOUNGE.centerZ + 2], size: [0.85, 0.9, 0.85] },
  { position: [7.5, 0.45, SPACE_LOUNGE.centerZ + 2], size: [0.85, 0.9, 0.85] },
  { position: [-4, 0.45, SPACE_LOUNGE.centerZ + 5.2], size: [0.85, 0.9, 0.85] },
  { position: [4, 0.45, SPACE_LOUNGE.centerZ + 5.2], size: [0.85, 0.9, 0.85] },
  { position: [0, 0.45, SPACE_LOUNGE.centerZ + 5.5], size: [0.85, 0.9, 0.85] },
];
// endregion

interface InstancedPropPartsProps {
  parts: readonly PropPart[];
  castShadow: boolean;
  children: ReactNode;
}

/** 정적 소품은 초기 배치 때만 행렬을 전송한다. */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function InstancedPropParts({ parts, castShadow, children }: InstancedPropPartsProps): ReactNode {
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
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, parts.length]}
      castShadow={castShadow}
      receiveShadow={castShadow}
    >
      <boxGeometry args={[1, 1, 1]} />
      {children}
    </instancedMesh>
  );
}

interface BunkerPropsProps {
  /** 모바일에서는 실시간 그림자를 끈다. 아바타와 같은 기준을 따른다. */
  hasRealtimeShadows: boolean;
}

function BunkerProps({ hasRealtimeShadows }: BunkerPropsProps): ReactNode {
  const metalParts = useMemo(() => [...serverRackParts, ...shelfParts, ...loungeMetalParts], []);

  return (
    <>
      <InstancedPropParts parts={metalParts} castShadow={hasRealtimeShadows}>
        <meshStandardMaterial color={METAL_COLOR} roughness={0.68} metalness={0.42} />
      </InstancedPropParts>

      <InstancedPropParts parts={crateParts} castShadow={hasRealtimeShadows}>
        <meshStandardMaterial color={CRATE_COLOR} roughness={0.92} metalness={0.06} />
      </InstancedPropParts>

      {/* 랙 화면은 발광이라 어두운 방에서도 같은 밝기로 보인다. */}
      <InstancedPropParts parts={rackScreenParts} castShadow={false}>
        <meshBasicMaterial color={SCREEN_COLOR} toneMapped={false} />
      </InstancedPropParts>
    </>
  );
}

const MemoizedBunkerProps = memo(BunkerProps);
MemoizedBunkerProps.displayName = "BunkerProps";

export default MemoizedBunkerProps;
