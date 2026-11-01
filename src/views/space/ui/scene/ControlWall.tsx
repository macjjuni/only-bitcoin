"use client";

import { memo, type ReactNode, useLayoutEffect, useMemo, useRef } from "react";
import { type InstancedMesh, Object3D } from "three";
import {
  SPACE_BILLBOARD,
  SPACE_BLOCK_DASHBOARD,
  SPACE_GROUND,
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
const wallHeight = 16;
const wallSurfaceZ = SPACE_WALL_Z - 0.4;
const wallColor = "#111923";
const panelColor = "#223345";
const structuralColor = "#30495b";
const recessColor = "#09111b";
const lightBarColor = "#70bdc8";
const structuralColumnPositions = [-30.5, -22.5, -14.5, 14.5, 22.5, 30.5];

/** 큰 금속 패널의 이음새만 남겨 전광판 뒤 장식이 시선을 나누지 않게 한다. */
const wallPanelParts: readonly WallPart[] = Array.from({ length: 16 }, (_, panelIndex) => ({
  position: [((panelIndex % 8) - 3.5) * 8, panelIndex < 8 ? 4 : 12, wallSurfaceZ + 0.04],
  size: [7.82, 7.78, 0.08],
}));

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
  position: [positionX, 9, wallSurfaceZ + 0.37],
  size: [0.055, 5.2, 0.025],
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
