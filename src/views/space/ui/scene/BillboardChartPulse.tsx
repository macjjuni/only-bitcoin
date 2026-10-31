"use client";

import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, type RefObject, useRef } from "react";
import type { Group, Mesh, MeshBasicMaterial, RingGeometry } from "three";
import { SPACE_BILLBOARD } from "@/entities/space";
import {
  BILLBOARD_CHART_MARKER,
  BILLBOARD_TEXTURE,
  type BillboardChartEndpoint,
} from "@/views/space/lib/billboardTexture";

interface BillboardChartPulseProps {
  endpointRef: RefObject<BillboardChartEndpoint | null>;
  prefersReducedMotion: boolean;
}

type PulseRingMesh = Mesh<RingGeometry, MeshBasicMaterial>;

const pulseDurationSeconds = 1.8;
const minimumRadiusInPixels = BILLBOARD_CHART_MARKER.coreRadius;
/** 원거리에서도 보이도록 키우며 가격축·시간 라벨 여백은 차트 레이아웃에서 확보한다. */
const maximumRadiusInPixels = BILLBOARD_CHART_MARKER.pulseRadius;
const maximumOpacity = 0.85;
const horizontalWorldUnitsPerPixel = SPACE_BILLBOARD.width / BILLBOARD_TEXTURE.width;
const verticalWorldUnitsPerPixel = SPACE_BILLBOARD.height / BILLBOARD_TEXTURE.height;
const pulseSurfaceZ = 0.004;

/** 끝점의 활성감만 더하고 숫자·차트 텍스처는 다시 업로드하지 않는 확산 링이다. */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function BillboardChartPulse({ endpointRef, prefersReducedMotion }: BillboardChartPulseProps): ReactNode {
  // region [Hooks]
  const groupRef = useRef<Group>(null);
  const firstRingRef = useRef<PulseRingMesh>(null);
  const secondRingRef = useRef<PulseRingMesh>(null);
  const lastColorRef = useRef<string>("");
  // endregion


  // region [Privates]
  const applyRingPhase = (
    ring: PulseRingMesh | null,
    elapsedSeconds: number,
    phaseOffset: number,
  ): void => {
    if (!ring) {
      return;
    }

    const phase = (elapsedSeconds / pulseDurationSeconds + phaseOffset) % 1;
    const easedExpansion = 1 - (1 - phase) ** 3;
    const radiusInPixels =
      minimumRadiusInPixels + (maximumRadiusInPixels - minimumRadiusInPixels) * easedExpansion;

    ring.scale.set(
      radiusInPixels * horizontalWorldUnitsPerPixel,
      radiusInPixels * verticalWorldUnitsPerPixel,
      1,
    );
    ring.material.opacity = maximumOpacity * (1 - phase) ** 1.4;
  };

  const applyEndpointColor = (color: string): void => {
    if (color === lastColorRef.current) {
      return;
    }

    firstRingRef.current?.material.color.set(color);
    secondRingRef.current?.material.color.set(color);
    lastColorRef.current = color;
  };

  const advancePulse = (elapsedSeconds: number): void => {
    const group = groupRef.current;
    const endpoint = endpointRef.current;

    if (!group) {
      return;
    }

    group.visible = endpoint !== null && !prefersReducedMotion;

    if (!endpoint || prefersReducedMotion) {
      return;
    }

    // 캔버스는 왼쪽 위, 패널은 중앙이 원점이다. Y를 뒤집어 동일한 끝점에 붙인다.
    group.position.set(
      (endpoint.x - BILLBOARD_TEXTURE.width / 2) * horizontalWorldUnitsPerPixel,
      (BILLBOARD_TEXTURE.height / 2 - endpoint.y) * verticalWorldUnitsPerPixel,
      pulseSurfaceZ,
    );
    applyEndpointColor(endpoint.color);
    applyRingPhase(firstRingRef.current, elapsedSeconds, 0);
    applyRingPhase(secondRingRef.current, elapsedSeconds, 0.5);
  };
  // endregion


  // region [Life Cycles]
  useFrame(({ clock }) => {
    advancePulse(clock.elapsedTime);
  });
  // endregion


  return (
    <group ref={groupRef} visible={false}>
      <mesh ref={firstRingRef}>
        <ringGeometry args={[0.68, 1, 48]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>

      <mesh ref={secondRingRef}>
        <ringGeometry args={[0.68, 1, 48]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

const MemoizedBillboardChartPulse = memo(BillboardChartPulse);
MemoizedBillboardChartPulse.displayName = "BillboardChartPulse";

export default MemoizedBillboardChartPulse;
