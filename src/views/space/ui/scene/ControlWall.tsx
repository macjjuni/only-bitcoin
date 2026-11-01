"use client";

import { memo, type ReactNode, useLayoutEffect, useMemo, useRef } from "react";
import { type InstancedMesh, Object3D } from "three";
import {
  SPACE_BILLBOARD,
  SPACE_BLOCK_DASHBOARD,
  SPACE_GROUND,
  SPACE_ROOM_HEIGHT,
  SPACE_WALL_Z,
} from "@/entities/space";

// region [Types]
interface ControlWallProps {
  wallAnchor: [number, number, number];
  displayScale: number;
}

interface WallPart {
  position: [number, number, number];
  size: [number, number, number];
  rotationY?: number;
}

interface HousingSlot {
  position: readonly [number, number, number];
  width: number;
  height: number;
  rotationY: number;
}

interface InstancedWallPartsProps {
  parts: readonly WallPart[];
  children: ReactNode;
}
// endregion

// region [Constants]
/** 방 높이와 같다. 뒷벽만 높으면 천장이 뒤쪽에서 끊겨 보인다. */
const wallHeight = SPACE_ROOM_HEIGHT;
const wallSurfaceZ = SPACE_WALL_Z - 0.4;
/**
 * 벙커 톤.
 *
 * 청록 라이트바(`#70bdc8`)는 관제실 색이었다. 주황으로 바꿔 비상등·전광판 광원과
 * 한 계열로 묶고, 벽·패널은 푸른 금속에서 콘크리트 회색으로 내렸다.
 */
const wallColor = "#1e2227";
const panelColor = "#262a30";
const structuralColor = "#33383f";
const recessColor = "#0c0e11";
const lightBarColor = "#ff8a3c";
/**
 * 수직 리브 위치.
 *
 * 바닥 폭(40)의 절반 안쪽이고, 두 표시 패널이 차지하는 구간(|x| ≤ 10.6)을
 * 비켜 둔다. 리브가 패널 뒤로 들어가면 테두리와 겹쳐 지저분해진다.
 */
const structuralColumnPositions = [-18.5, -12.5, 12.5, 18.5];

/**
 * 큰 금속 패널의 이음새만 남겨 전광판 뒤 장식이 시선을 나누지 않게 한다.
 *
 * 바닥 폭 40 을 8 m 패널 5장으로 채우고 두 줄(y 4·12)로 쌓는다. 열 수를 바닥
 * 폭에서 끌어오지 않고 상수로 둔 것은, 패널 폭이 바뀌면 이음새 두께(7.82)도
 * 같이 손봐야 하기 때문이다.
 */
const WALL_PANEL_COLUMNS = 5;
const WALL_PANEL_ROWS = 2;
const wallPanelHeight = wallHeight / WALL_PANEL_ROWS;
const wallPanelParts: readonly WallPart[] = Array.from(
  { length: WALL_PANEL_COLUMNS * WALL_PANEL_ROWS },
  (_, panelIndex): WallPart => ({
    position: [
      ((panelIndex % WALL_PANEL_COLUMNS) - (WALL_PANEL_COLUMNS - 1) / 2) * 8,
      (Math.floor(panelIndex / WALL_PANEL_COLUMNS) + 0.5) * wallPanelHeight,
      wallSurfaceZ + 0.04,
    ],
    size: [7.82, wallPanelHeight - 0.22, 0.08],
  }),
);

const structuralParts: readonly WallPart[] = [
  ...structuralColumnPositions.map(
    (positionX): WallPart => ({
      position: [positionX, wallHeight / 2, wallSurfaceZ + 0.18],
      size: [0.32, wallHeight - 0.6, 0.36],
    }),
  ),
  {
    position: [0, 0.35, wallSurfaceZ + 0.18],
    size: [SPACE_GROUND.width, 0.5, 0.36],
  },
  {
    position: [0, wallHeight - 0.35, wallSurfaceZ + 0.18],
    size: [SPACE_GROUND.width, 0.5, 0.36],
  },
];

const wallLightParts: readonly WallPart[] = structuralColumnPositions.map((positionX) => ({
  position: [positionX, wallHeight * 0.56, wallSurfaceZ + 0.37],
  size: [0.055, wallHeight * 0.33, 0.025],
}));

const housingSlots: readonly HousingSlot[] = [
  {
    position: SPACE_BILLBOARD.offset,
    width: SPACE_BILLBOARD.frameWidth,
    height: SPACE_BILLBOARD.frameHeight,
    rotationY: 0,
  },
  {
    position: SPACE_BLOCK_DASHBOARD.offset,
    width: SPACE_BLOCK_DASHBOARD.width + 0.4,
    height: SPACE_BLOCK_DASHBOARD.height + 0.4,
    rotationY: SPACE_BLOCK_DASHBOARD.rotationY,
  },
];
// endregion

// region [Privates]
/** 패널의 회전축을 따라 뒤로 이동해 기울어진 표시 면과 평행한 장비함을 만든다. */
const createHousingPart = (
  slot: HousingSlot,
  depthOffset: number,
  size: [number, number, number],
  offsetY = 0,
): WallPart => ({
  position: [
    slot.position[0] + depthOffset * Math.sin(slot.rotationY),
    slot.position[1] + offsetY,
    slot.position[2] + depthOffset * Math.cos(slot.rotationY),
  ],
  size,
  rotationY: slot.rotationY,
});

const housingShellParts = housingSlots.map((slot) => {
  return createHousingPart(slot, -0.44, [slot.width + 0.9, slot.height + 0.8, 0.42]);
});

const housingRimParts = housingSlots.map((slot) => {
  return createHousingPart(slot, -0.2, [slot.width + 0.3, slot.height + 0.26, 0.08]);
});

const housingLightParts = housingSlots.map((slot) => {
  return createHousingPart(slot, -0.16, [slot.width * 0.3, 0.045, 0.025], -slot.height / 2 - 0.23);
});
// endregion

/** 정적 부품은 초기 배치 때만 행렬을 전송하고 프레임 갱신을 추가하지 않는다. */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function InstancedWallParts({ parts, children }: InstancedWallPartsProps): ReactNode {
  // region [Hooks]
  const meshRef = useRef<InstancedMesh>(null);
  const transformProxy = useMemo(() => new Object3D(), []);
  // endregion


  // region [Privates]
  const applyPartTransforms = (): void => {
    const mesh = meshRef.current;

    if (!mesh) {
      return;
    }

    parts.forEach((part, partIndex) => {
      transformProxy.position.set(...part.position);
      transformProxy.scale.set(...part.size);
      transformProxy.rotation.set(0, part.rotationY ?? 0, 0);
      transformProxy.updateMatrix();
      mesh.setMatrixAt(partIndex, transformProxy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  };
  // endregion


  // region [Life Cycles]
  useLayoutEffect(() => {
    applyPartTransforms();
  }, [parts, transformProxy]);
  // endregion


  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, parts.length]} count={parts.length}>
      <boxGeometry args={[1, 1, 1]} />
      {children}
    </instancedMesh>
  );
}

/** 관제 벽과 디스플레이 뒤 장비함. 새 광원·그림자 패스 없이 7개 렌더 배치로 그린다. */
function ControlWall({ wallAnchor, displayScale }: ControlWallProps): ReactNode {
  return (
    <group>
      <mesh position={[0, wallHeight / 2, wallSurfaceZ]}>
        <planeGeometry args={[SPACE_GROUND.width, wallHeight]} />
        <meshStandardMaterial color={wallColor} roughness={0.86} metalness={0.22} />
      </mesh>

      <InstancedWallParts parts={wallPanelParts}>
        <meshStandardMaterial color={panelColor} roughness={0.72} metalness={0.38} />
      </InstancedWallParts>

      <InstancedWallParts parts={structuralParts}>
        <meshStandardMaterial color={structuralColor} roughness={0.5} metalness={0.5} />
      </InstancedWallParts>

      <InstancedWallParts parts={wallLightParts}>
        <meshStandardMaterial
          color={lightBarColor}
          emissive={lightBarColor}
          emissiveIntensity={0.48}
          roughness={0.5}
        />
      </InstancedWallParts>

      {/* 전광판과 같은 기준점·배율을 써서 좁은 화면에서도 장비함이 화면과 분리되지 않는다. */}
      <group position={wallAnchor} scale={displayScale}>
        <InstancedWallParts parts={housingShellParts}>
          <meshStandardMaterial color={recessColor} roughness={0.75} metalness={0.3} />
        </InstancedWallParts>

        <InstancedWallParts parts={housingRimParts}>
          <meshStandardMaterial color={structuralColor} roughness={0.48} metalness={0.5} />
        </InstancedWallParts>

        <InstancedWallParts parts={housingLightParts}>
          <meshStandardMaterial
            color={lightBarColor}
            emissive={lightBarColor}
            emissiveIntensity={0.32}
            roughness={0.5}
          />
        </InstancedWallParts>
      </group>
    </group>
  );
}

const MemoizedControlWall = memo(ControlWall);
MemoizedControlWall.displayName = "ControlWall";

export default MemoizedControlWall;
