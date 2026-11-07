"use client";

import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, type RefObject, useRef } from "react";
import type { Mesh, MeshBasicMaterial, PlaneGeometry } from "three";
import { SPACE_BLOCK_DASHBOARD } from "@/entities/space";
import {
  BLOCK_DASHBOARD_TEXTURE,
  resolveHalvingSegmentRect,
} from "@/views/space/lib/blockDashboardTexture";
import { SCREEN_COLORS } from "@/views/space/lib/screenCanvas";

interface HalvingSegmentBlinkProps {
  /** 텍스처에 칠해진 칸 수. 프레임 루프에서 읽어 진행률이 바뀌어도 리렌더하지 않는다. */
  filledCountRef: RefObject<number>;
  prefersReducedMotion: boolean;
}

type BlinkMesh = Mesh<PlaneGeometry, MeshBasicMaterial>;

const blinkDurationSeconds = 1.2;
const horizontalWorldUnitsPerPixel = SPACE_BLOCK_DASHBOARD.width / BLOCK_DASHBOARD_TEXTURE.width;
const verticalWorldUnitsPerPixel = SPACE_BLOCK_DASHBOARD.height / BLOCK_DASHBOARD_TEXTURE.height;
/** LIVE 링(0.005)보다 뒤. 겹칠 자리는 아니지만 깊이 다툼을 피하려 층을 나눈다. */
const blinkSurfaceZ = 0.003;

/**
 * 반감기 막대 끝 칸 깜빡임.
 *
 * 텍스처는 진행률이 바뀔 때만 다시 올리므로 깜빡임을 구울 수 없다. 마지막으로
 * 채운 흰 칸 위에 빈 칸 색 판을 겹치고 불투명도만 오르내려 흰색 ↔ 빈 칸을 오간다.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function HalvingSegmentBlink({ filledCountRef, prefersReducedMotion }: HalvingSegmentBlinkProps): ReactNode {
  // region [Hooks]
  const meshRef = useRef<BlinkMesh>(null);
  const lastIndexRef = useRef<number>(-1);
  // endregion


  // region [Privates]
  /** 끝 칸이 바뀔 때만 위치·크기를 옮긴다. 캔버스는 왼쪽 위, 패널은 중앙이 원점이라 Y를 뒤집는다. */
  const placeOnSegment = (mesh: BlinkMesh, index: number): void => {
    const { x, y, width, height } = resolveHalvingSegmentRect(index);

    mesh.position.set(
      (x + width / 2 - BLOCK_DASHBOARD_TEXTURE.width / 2) * horizontalWorldUnitsPerPixel,
      (BLOCK_DASHBOARD_TEXTURE.height / 2 - (y + height / 2)) * verticalWorldUnitsPerPixel,
      blinkSurfaceZ,
    );
    mesh.scale.set(width * horizontalWorldUnitsPerPixel, height * verticalWorldUnitsPerPixel, 1);
    lastIndexRef.current = index;
  };

  const advanceBlink = (elapsedSeconds: number): void => {
    const mesh = meshRef.current;

    if (!mesh) {
      return;
    }

    const lastFilledIndex = (filledCountRef.current ?? 0) - 1;

    // 채운 칸이 없으면 깜빡일 끝도 없다. 모션 줄이기면 막대를 정지 화면으로 둔다.
    mesh.visible = lastFilledIndex >= 0 && !prefersReducedMotion;

    if (!mesh.visible) {
      return;
    }

    if (lastFilledIndex !== lastIndexRef.current) {
      placeOnSegment(mesh, lastFilledIndex);
    }

    // 코사인으로 부드럽게 오가되 제곱해 켜진(흰) 구간을 조금 길게 둔다.
    const phase = (elapsedSeconds / blinkDurationSeconds) % 1;
    const dimness = (0.5 - 0.5 * Math.cos(phase * Math.PI * 2)) ** 2;

    mesh.material.opacity = dimness;
  };
  // endregion


  // region [Life Cycles]
  useFrame(({ clock }) => {
    advanceBlink(clock.elapsedTime);
  });
  // endregion


  return (
    <mesh ref={meshRef} visible={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={SCREEN_COLORS.segmentEmpty}
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

const MemoizedHalvingSegmentBlink = memo(HalvingSegmentBlink);
MemoizedHalvingSegmentBlink.displayName = "HalvingSegmentBlink";

export default MemoizedHalvingSegmentBlink;
