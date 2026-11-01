"use client";

import { useThree } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { SPACE_GROUND, SPACE_LOUNGE } from "@/entities/space";

const FLOOR_TEXTURE_WIDTH = 2048;
const FLOOR_PIXELS_PER_METER = FLOOR_TEXTURE_WIDTH / SPACE_GROUND.width;
const FLOOR_PANEL_WIDTH = 8;
/** 바닥 폭 40·깊이 32 를 정확히 나누는 값. 나누어지지 않으면 끝줄이 빈 띠로 남는다. */
const FLOOR_PANEL_DEPTH = 8;
/**
 * 지하 벙커 바닥.
 *
 * 전에는 금속 패널에 안내선과 집결 코너를 그려 관제 시설 어휘를 썼다. 아지트에는
 * 바닥에 길을 그려 넣을 이유가 없고, 선이 공간을 "시설" 로 읽히게 만든다.
 * 거친 콘크리트 판으로 바꾸고 중앙에 러그를 깔았다 — 러그 한 장이 분위기를
 * 가장 많이 바꾸면서 드로우 콜은 그대로다(텍스처 한 장에 함께 그린다).
 */
const FLOOR_COLORS = {
  joint: "#13161a",
  panels: ["#23272c", "#25292e", "#21252a"],
  bevel: "#2f343a",
  fastener: "#3a4047",
  stain: "#1c1f23",
  rug: "#2f231d",
  rugEdge: "#4a3227",
  rugPattern: "#3a2a21",
} as const;

/** 라운지 러그. 소품·펜던트와 같은 구역 상수를 본다. */
const RUG_AREA = SPACE_LOUNGE;

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

/** 콘크리트 얼룩. 같은 색 판이 반복되는 티를 줄인다. */
const drawFloorStains = (context: CanvasRenderingContext2D): void => {
  const stainSpots: readonly [number, number, number][] = [
    [-14, -12, 3.5],
    [-6, 6, 2.6],
    [9, -6, 3.2],
    [16, 8, 2.2],
    [2, 11, 2.8],
    [-17, 4, 2],
  ];

  context.fillStyle = FLOOR_COLORS.stain;

  for (const [worldX, worldZ, radius] of stainSpots) {
    context.beginPath();
    context.ellipse(
      toFloorTextureX(worldX),
      toFloorTextureZ(worldZ),
      radius * FLOOR_PIXELS_PER_METER,
      radius * 0.7 * FLOOR_PIXELS_PER_METER,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
};

/** 라운지 러그. 테두리와 성긴 격자만 그려 멀리서도 면으로 읽히게 한다. */
const drawLoungeRug = (context: CanvasRenderingContext2D): void => {
  const left = toFloorTextureX(-RUG_AREA.halfWidth);
  const right = toFloorTextureX(RUG_AREA.halfWidth);
  const back = toFloorTextureZ(RUG_AREA.centerZ - RUG_AREA.halfDepth);
  const front = toFloorTextureZ(RUG_AREA.centerZ + RUG_AREA.halfDepth);

  context.fillStyle = FLOOR_COLORS.rug;
  context.fillRect(left, back, right - left, front - back);

  context.strokeStyle = FLOOR_COLORS.rugEdge;
  context.lineWidth = 6;
  context.strokeRect(left + 3, back + 3, right - left - 6, front - back - 6);

  context.strokeStyle = FLOOR_COLORS.rugPattern;
  context.lineWidth = 3;
  context.strokeRect(left + 26, back + 26, right - left - 52, front - back - 52);

  for (const worldX of [-3.5, 0, 3.5]) {
    context.beginPath();
    context.moveTo(toFloorTextureX(worldX), back + 26);
    context.lineTo(toFloorTextureX(worldX), front - 26);
    context.stroke();
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
    drawFloorStains(context);
    drawLoungeRug(context);
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
          {/* 콘크리트라 금속기를 거의 없앤다. 금속기가 남으면 조명이 번져 축축해 보인다. */}
      <meshStandardMaterial map={floorTexture} roughness={0.97} metalness={0.04} />
    </mesh>
  );
}

const MemoizedGround = memo(Ground);
MemoizedGround.displayName = "Ground";

export default MemoizedGround;
