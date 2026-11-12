"use client";

import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo, useRef } from "react";
import {
  Color,
  DoubleSide,
  DynamicDrawUsage,
  type Group,
  type InstancedMesh,
  type MeshBasicMaterial,
  Object3D,
} from "three";
import type { SpaceCelebration } from "@/entities/space";
import { usePrefersReducedMotion } from "@/features/space-controls";
import {
  createConfettiParticles,
  readCelebrationBurstElapsed,
  readConfettiPose,
  SCREEN_CELEBRATION,
} from "../../lib/screenCelebration";

interface ScreenCelebrationProps {
  celebration: SpaceCelebration | null;
  clockOffsetMs: number | null;
  frame: {
    width: number;
    height: number;
    position: readonly [number, number, number];
    rotationY: number;
  };
}

/** 10초 간격으로 폭죽 3회. 쉬는 동안은 숨기고 입자 계산·GPU 업로드를 하지 않는다. */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function ScreenCelebration({ celebration, clockOffsetMs, frame }: ScreenCelebrationProps): ReactNode {
  // region [Hooks]
  const groupRef = useRef<Group>(null);
  const particlesRef = useRef<InstancedMesh>(null);
  const flashRef = useRef<MeshBasicMaterial>(null);
  const particles = useMemo(() => createConfettiParticles(celebration?.seed ?? 0), [celebration?.seed]);
  const transform = useMemo(() => new Object3D(), []);
  const prefersReducedMotion = usePrefersReducedMotion();
  // endregion


  // region [Privates]
  const prepareParticles = (): void => {
    const mesh = particlesRef.current;
    if (!mesh) {
      return;
    }
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    const color = new Color();
    particles.forEach((particle, index) => {
      color.set(particle.isSparkle ? "#fff3d1" : SCREEN_CELEBRATION.colors[index % SCREEN_CELEBRATION.colors.length]);
      mesh.setColorAt(index, color);
    });
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  };

  const advanceCelebration = (): void => {
    const group = groupRef.current;
    const mesh = particlesRef.current;
    if (!group || !mesh) {
      return;
    }
    // 시작 시각 기준으로 계산해 탭 복귀 시 놓친 폭죽을 몰아서 재생하지 않는다.
    const elapsedSeconds = celebration && clockOffsetMs !== null ? readCelebrationBurstElapsed((performance.now() + clockOffsetMs - celebration.startsAt) / 1000) : null;
    group.visible = !prefersReducedMotion && elapsedSeconds !== null;
    if (!group.visible || elapsedSeconds === null) {
      return;
    }

    particles.forEach((particle, index) => {
      const pose = readConfettiPose(particle, elapsedSeconds);
      transform.position.set(pose.x * frame.width, pose.y * frame.height, 0.09);
      transform.rotation.set(0, 0, pose.rotation);
      transform.scale.set(pose.size * frame.width * pose.flutter, pose.size * frame.height * 1.5, 1);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (flashRef.current) {
      flashRef.current.opacity = 0.1 * Math.max(0, 1 - elapsedSeconds / 0.4) ** 2;
    }
  };
  // endregion


  // region [Life Cycles]
  useEffect(() => prepareParticles(), [particles]);
  useFrame(advanceCelebration);
  // endregion

  return (
    <group ref={groupRef} visible={false} position={frame.position} rotation={[0, frame.rotationY, 0]}>
      <mesh position={[0, 0, 0.07]} renderOrder={1}>
        <planeGeometry args={[frame.width, frame.height]} />
        <meshBasicMaterial ref={flashRef} color="#ffd166" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* 전광판의 불투명 표면과 투명 숫자 레이어 다음에 그리되, 앞에 선 캐릭터의 깊이는 유지한다. */}
      <instancedMesh ref={particlesRef} args={[undefined, undefined, SCREEN_CELEBRATION.particleCount]} frustumCulled={false} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial side={DoubleSide} transparent depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

export default memo(ScreenCelebration);
