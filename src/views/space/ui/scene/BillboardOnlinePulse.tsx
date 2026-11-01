"use client";

import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, type RefObject, useRef } from "react";
import type { Group, Mesh, MeshBasicMaterial, RingGeometry } from "three";
import { SPACE_BILLBOARD } from "@/entities/space";
import {
  BILLBOARD_COLORS,
  BILLBOARD_ONLINE_MARKER,
  BILLBOARD_TEXTURE,
} from "@/views/space/lib/billboardTexture";

interface BillboardOnlinePulseProps {
  /** 프레임 루프에서 읽는다. 접속이 끊기고 붙을 때마다 리렌더하지 않는다. */
  isOnlineRef: RefObject<boolean>;
  prefersReducedMotion: boolean;
}

type PulseRingMesh = Mesh<RingGeometry, MeshBasicMaterial>;

const pulseDurationSeconds = 2.2;
const minimumRadiusInPixels = BILLBOARD_ONLINE_MARKER.coreRadius;
const maximumRadiusInPixels = BILLBOARD_ONLINE_MARKER.pulseRadius;
const maximumOpacity = 0.7;
const horizontalWorldUnitsPerPixel = SPACE_BILLBOARD.width / BILLBOARD_TEXTURE.width;
const verticalWorldUnitsPerPixel = SPACE_BILLBOARD.height / BILLBOARD_TEXTURE.height;
/** 차트 끝점 펄스(0.004)보다 앞에 둬 겹칠 일이 없어도 깊이 다툼을 없앤다. */
const pulseSurfaceZ = 0.005;

/**
 * 우측 상단 접속 표시 점의 확산 링.
 *
 * 베이스 텍스처는 상태가 바뀔 때만 다시 올리므로 프레임마다 커지는 원을 캔버스에
 * 구울 수 없다. 점 자체는 텍스처가 그리고 이 컴포넌트는 링만 겹친다.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function BillboardOnlinePulse({ isOnlineRef, prefersReducedMotion }: BillboardOnlinePulseProps): ReactNode {
  // region [Hooks]
  const groupRef = useRef<Group>(null);
  const firstRingRef = useRef<PulseRingMesh>(null);
  const secondRingRef = useRef<PulseRingMesh>(null);
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

  const advancePulse = (elapsedSeconds: number): void => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    // 끊긴 동안에는 숨긴다. 빨간 점이 살아 있는 것처럼 뛰면 안 된다.
    group.visible = isOnlineRef.current === true && !prefersReducedMotion;

    if (!group.visible) {
      return;
    }

    applyRingPhase(firstRingRef.current, elapsedSeconds, 0);
    applyRingPhase(secondRingRef.current, elapsedSeconds, 0.5);
  };
  // endregion


  // region [Life Cycles]
  useFrame(({ clock }) => {
    advancePulse(clock.elapsedTime);
  });
  // endregion


  // 캔버스는 왼쪽 위, 패널은 중앙이 원점이다. Y를 뒤집어 같은 점에 붙인다.
  return (
    <group
      ref={groupRef}
      visible={false}
      position={[
        (BILLBOARD_ONLINE_MARKER.x - BILLBOARD_TEXTURE.width / 2) * horizontalWorldUnitsPerPixel,
        (BILLBOARD_TEXTURE.height / 2 - BILLBOARD_ONLINE_MARKER.y) * verticalWorldUnitsPerPixel,
        pulseSurfaceZ,
      ]}
    >
      <mesh ref={firstRingRef}>
        <ringGeometry args={[0.6, 1, 32]} />
        <meshBasicMaterial
          color={BILLBOARD_COLORS.online}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={secondRingRef}>
        <ringGeometry args={[0.6, 1, 32]} />
        <meshBasicMaterial
          color={BILLBOARD_COLORS.online}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

const MemoizedBillboardOnlinePulse = memo(BillboardOnlinePulse);
MemoizedBillboardOnlinePulse.displayName = "BillboardOnlinePulse";

export default MemoizedBillboardOnlinePulse;
