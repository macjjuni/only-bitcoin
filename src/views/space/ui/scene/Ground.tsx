"use client";

import { useThree } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { SPACE_GROUND, SPACE_WALL_Z } from "@/entities/space";

const FLOOR_TEXTURE_WIDTH = 2048;
const FLOOR_PIXELS_PER_METER = FLOOR_TEXTURE_WIDTH / SPACE_GROUND.width;
const FLOOR_PANEL_WIDTH = 8;
const FLOOR_PANEL_DEPTH = 6;
const FLOOR_COLORS = {
  joint: "#09111b",
  panels: ["#202d3b", "#22303e", "#24323f"],
  bevel: "#304252",
  fastener: "#3b4d5d",
  guide: "#4b6475",
  gathering: "#81694b",
} as const;
const GATHERING_AREA = {
  halfWidth: 9,
  backZ: SPACE_WALL_Z + 4.5,
  frontZ: SPACE_WALL_Z + 11,
  cornerLength: 1.2,
} as const;

interface GroundProps {
  /** 모바일에서는 그림자 수신도 끈다. */
  hasRealtimeShadows: boolean;
}

// region [Privates]
const toFloorTextureX = (worldX: number): number => {
  return (worldX + SPACE_GROUND.width / 2) * FLOOR_PIXELS_PER_METER;
};

const toFloorTextureZ = (worldZ: number): number => {
  const floorBackZ = SPACE_GROUND.centerZ - SPACE_GROUND.depth / 2;
  return (worldZ - floorBackZ) * FLOOR_PIXELS_PER_METER;
};

/** 넓은 판재와 이음새를 한 번만 그려 패널 수와 관계없이 바닥 드로우 콜을 1개로 유지한다. */
const drawFloorPanels = (context: CanvasRenderingContext2D): void => {
  const panelWidthInPixels = FLOOR_PANEL_WIDTH * FLOOR_PIXELS_PER_METER;
  const panelDepthInPixels = FLOOR_PANEL_DEPTH * FLOOR_PIXELS_PER_METER;
  const rowCount = SPACE_GROUND.depth / FLOOR_PANEL_DEPTH;
  const columnCount = SPACE_GROUND.width / FLOOR_PANEL_WIDTH;

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const panelX = columnIndex * panelWidthInPixels;
      const panelY = rowIndex * panelDepthInPixels;
      const colorIndex = (rowIndex + columnIndex * 2) % FLOOR_COLORS.panels.length;

      context.fillStyle = FLOOR_COLORS.panels[colorIndex];
      context.fillRect(panelX + 1, panelY + 1, panelWidthInPixels - 2, panelDepthInPixels - 2);

      context.strokeStyle = FLOOR_COLORS.bevel;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(panelX + 2.5, panelY + panelDepthInPixels - 2.5);
      context.lineTo(panelX + 2.5, panelY + 2.5);
      context.lineTo(panelX + panelWidthInPixels - 2.5, panelY + 2.5);
      context.stroke();

      context.fillStyle = FLOOR_COLORS.fastener;
      context.fillRect(panelX + 8, panelY + 8, 2, 2);
      context.fillRect(panelX + panelWidthInPixels - 10, panelY + panelDepthInPixels - 10, 2, 2);
    }
  }
};

const drawFloorGuides = (context: CanvasRenderingContext2D): void => {
  context.strokeStyle = FLOOR_COLORS.guide;
  context.lineWidth = 2;

  // 가운데는 비워 두고 양쪽의 가는 선만 전광판 앞 모임 구역으로 잇는다.
  for (const worldX of [-3, 3]) {
    context.beginPath();
    context.moveTo(toFloorTextureX(worldX), toFloorTextureZ(12));
    context.lineTo(toFloorTextureX(worldX), toFloorTextureZ(GATHERING_AREA.frontZ));
    context.stroke();

    for (const worldZ of [5, -2]) {
      context.beginPath();
      context.moveTo(toFloorTextureX(worldX - 0.2), toFloorTextureZ(worldZ + 0.25));
      context.lineTo(toFloorTextureX(worldX), toFloorTextureZ(worldZ));
      context.lineTo(toFloorTextureX(worldX + 0.2), toFloorTextureZ(worldZ + 0.25));
      context.stroke();
    }
  }

  context.strokeStyle = FLOOR_COLORS.gathering;
  context.lineWidth = 3;

  for (const sideDirection of [-1, 1]) {
    for (const cornerZ of [GATHERING_AREA.backZ, GATHERING_AREA.frontZ]) {
      const cornerX = sideDirection * GATHERING_AREA.halfWidth;
      const depthDirection = cornerZ === GATHERING_AREA.backZ ? 1 : -1;

      context.beginPath();
      context.moveTo(
        toFloorTextureX(cornerX - sideDirection * GATHERING_AREA.cornerLength),
        toFloorTextureZ(cornerZ),
      );
      context.lineTo(toFloorTextureX(cornerX), toFloorTextureZ(cornerZ));
      context.lineTo(
        toFloorTextureX(cornerX),
        toFloorTextureZ(cornerZ + depthDirection * GATHERING_AREA.cornerLength),
      );
      context.stroke();
    }
  }
};

const createFloorTexture = (): CanvasTexture => {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = FLOOR_TEXTURE_WIDTH;
  canvasElement.height = SPACE_GROUND.depth * FLOOR_PIXELS_PER_METER;
  const texture = new CanvasTexture(canvasElement);
  texture.colorSpace = SRGBColorSpace;
  const context = canvasElement.getContext("2d");

  if (context) {
    context.fillStyle = FLOOR_COLORS.joint;
    context.fillRect(0, 0, canvasElement.width, canvasElement.height);
    drawFloorPanels(context);
    drawFloorGuides(context);
  }

  return texture;
};
// endregion

// biome-ignore format: AGENTS.md requires two blank lines between regions.
function Ground({ hasRealtimeShadows }: GroundProps): ReactNode {
  // region [Hooks]
  const renderer = useThree((rootState) => rootState.gl);
  const floorTexture = useMemo(() => createFloorTexture(), []);
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    floorTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    floorTexture.needsUpdate = true;

    return () => {
      floorTexture.dispose();
    };
  }, [floorTexture, renderer]);
  // endregion

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, SPACE_GROUND.centerZ]}
      receiveShadow={hasRealtimeShadows}
    >
      <planeGeometry args={[SPACE_GROUND.width, SPACE_GROUND.depth]} />
      <meshStandardMaterial map={floorTexture} roughness={0.94} metalness={0.12} />
    </mesh>
  );
}

const MemoizedGround = memo(Ground);
MemoizedGround.displayName = "Ground";

export default MemoizedGround;
