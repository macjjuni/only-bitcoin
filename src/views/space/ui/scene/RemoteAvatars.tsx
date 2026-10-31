"use client";

import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo, useRef } from "react";
import { Color, type InstancedMesh, Object3D } from "three";
import {
  type RemotePlayer,
  resolveAvatarColor,
  SPACE_AVATAR,
  SPACE_MAX_OCCUPANTS,
} from "@/entities/space";
import { createShadowBlobTexture } from "@/views/space/lib/shadowBlobTexture";

const SHADOW_LIFT_Y = 0.02;

interface RemoteAvatarsProps {
  players: readonly RemotePlayer[];
}

/**
 * 원격 아바타를 인스턴싱으로 그린다.
 *
 * 개별 `<mesh>` 로 만들면 50명이면 몸통·머리·그림자로 150 드로우 콜이 되어
 * 모바일 예산(50)을 세 배 넘긴다. `InstancedMesh` 3개로 고정해 전원을
 * 드로우 콜 3개에 담는다. 근거는 `docs/btc-space-3d.md` §8 에 있다.
 */
function RemoteAvatars({ players }: RemoteAvatarsProps): ReactNode {
  // region [Hooks]
  const bodyMeshRef = useRef<InstancedMesh>(null);
  const headMeshRef = useRef<InstancedMesh>(null);
  const shadowMeshRef = useRef<InstancedMesh>(null);
  const shadowTexture = useMemo(() => createShadowBlobTexture(), []);
  /** 행렬 계산용 임시 객체. 프레임마다 새로 만들면 GC 부하가 측정값에 섞인다. */
  const transformProxy = useMemo(() => new Object3D(), []);
  const colorProxy = useMemo(() => new Color(), []);
  // endregion

  // region [Privates]
  const applyInstanceCounts = (instanceCount: number): void => {
    for (const meshRef of [bodyMeshRef, headMeshRef, shadowMeshRef]) {
      if (meshRef.current) {
        meshRef.current.count = instanceCount;
      }
    }
  };

  const applyInstanceColors = (): void => {
    players.forEach((player, instanceIndex) => {
      colorProxy.set(resolveAvatarColor(player.colorIndex));
      bodyMeshRef.current?.setColorAt(instanceIndex, colorProxy);
      headMeshRef.current?.setColorAt(instanceIndex, colorProxy);
    });

    for (const meshRef of [bodyMeshRef, headMeshRef]) {
      if (meshRef.current?.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }
  };

  const applyInstanceTransforms = (): void => {
    players.forEach((player, instanceIndex) => {
      transformProxy.rotation.set(0, player.yaw, 0);

      transformProxy.position.set(player.x, SPACE_AVATAR.bodyCenterY, player.z);
      transformProxy.updateMatrix();
      bodyMeshRef.current?.setMatrixAt(instanceIndex, transformProxy.matrix);

      transformProxy.position.set(player.x, SPACE_AVATAR.headCenterY, player.z);
      transformProxy.updateMatrix();
      headMeshRef.current?.setMatrixAt(instanceIndex, transformProxy.matrix);

      // 그림자 평면은 눕혀야 하므로 회전을 따로 준다.
      transformProxy.rotation.set(-Math.PI / 2, 0, 0);
      transformProxy.position.set(player.x, SHADOW_LIFT_Y, player.z);
      transformProxy.updateMatrix();
      shadowMeshRef.current?.setMatrixAt(instanceIndex, transformProxy.matrix);
    });

    for (const meshRef of [bodyMeshRef, headMeshRef, shadowMeshRef]) {
      if (meshRef.current) {
        meshRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  };
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    applyInstanceCounts(players.length);
    applyInstanceColors();
  }, [players]);

  useEffect(() => {
    return () => {
      shadowTexture.dispose();
    };
  }, [shadowTexture]);

  useFrame(() => {
    applyInstanceTransforms();
  });
  // endregion

  return (
    <>
      <instancedMesh ref={bodyMeshRef} args={[undefined, undefined, SPACE_MAX_OCCUPANTS]}>
        <capsuleGeometry
          args={[
            SPACE_AVATAR.bodyRadius,
            SPACE_AVATAR.bodyLength,
            SPACE_AVATAR.bodyCapSegments,
            SPACE_AVATAR.bodyRadialSegments,
          ]}
        />
        <meshStandardMaterial roughness={0.45} metalness={0.2} />
      </instancedMesh>

      <instancedMesh ref={headMeshRef} args={[undefined, undefined, SPACE_MAX_OCCUPANTS]}>
        <sphereGeometry
          args={[
            SPACE_AVATAR.headRadius,
            SPACE_AVATAR.headWidthSegments,
            SPACE_AVATAR.headHeightSegments,
          ]}
        />
        <meshStandardMaterial roughness={0.35} metalness={0.25} />
      </instancedMesh>

      <instancedMesh ref={shadowMeshRef} args={[undefined, undefined, SPACE_MAX_OCCUPANTS]}>
        <planeGeometry args={[SPACE_AVATAR.shadowRadius * 2, SPACE_AVATAR.shadowRadius * 2]} />
        <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} />
      </instancedMesh>
    </>
  );
}

const MemoizedRemoteAvatars = memo(RemoteAvatars);
MemoizedRemoteAvatars.displayName = "RemoteAvatars";

export default MemoizedRemoteAvatars;
