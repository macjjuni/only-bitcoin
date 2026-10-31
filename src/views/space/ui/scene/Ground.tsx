"use client";

import { Grid } from "@react-three/drei";
import { memo, type ReactNode } from "react";
import { SPACE_GROUND, SPACE_WALL_Z } from "@/entities/space";

const FLOOR_COLOR = "#0a0e17";
const GRID_CELL_COLOR = "#1d2738";
const GRID_SECTION_COLOR = "#33415c";
const WALL_COLOR = "#0d121c";
const WALL_HEIGHT = 16;

interface GroundProps {
  /** 모바일에서는 그림자 수신도 끈다. */
  hasRealtimeShadows: boolean;
}

function Ground({ hasRealtimeShadows }: GroundProps): ReactNode {
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, SPACE_GROUND.centerZ]}
        receiveShadow={hasRealtimeShadows}
      >
        <planeGeometry args={[SPACE_GROUND.width, SPACE_GROUND.depth]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.85} metalness={0.15} />
      </mesh>

      {/* 정거장 바닥 패널 라인. 셰이더 격자라 드로우 콜 1개로 끝난다. */}
      <Grid
        position={[0, 0.01, SPACE_GROUND.centerZ]}
        args={[SPACE_GROUND.width, SPACE_GROUND.depth]}
        cellSize={2}
        cellThickness={0.6}
        cellColor={GRID_CELL_COLOR}
        sectionSize={10}
        sectionThickness={1.2}
        sectionColor={GRID_SECTION_COLOR}
        fadeDistance={70}
        fadeStrength={1.4}
        infiniteGrid={false}
      />

      {/* 전광판이 허공에 뜨지 않도록 뒷벽을 세운다. */}
      <mesh position={[0, WALL_HEIGHT / 2, SPACE_WALL_Z - 0.4]}>
        <planeGeometry args={[SPACE_GROUND.width, WALL_HEIGHT]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.9} metalness={0.1} />
      </mesh>
    </>
  );
}

const MemoizedGround = memo(Ground);
MemoizedGround.displayName = "Ground";

export default MemoizedGround;
