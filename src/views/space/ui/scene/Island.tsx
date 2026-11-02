"use client";

import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, type RefObject, useEffect, useMemo } from "react";
import type { Mesh, Object3D } from "three";
import type { SpaceTerrain } from "@/entities/space";
import {
  ISLAND_NODE_NAMES,
  type LanternAnchor,
  useIslandModel,
} from "@/views/space/lib/islandModel";
import { createIslandTerrain, type IslandTerrain } from "@/views/space/lib/islandTerrain";

/**
 * 폭포가 흐르는 속도(UV/초).
 *
 * 텍스처 한 장이 세로로 2 m 를 덮으므로 0.9 는 초속 1.8 m 쯤으로 읽힌다.
 * 실제 낙하(자유낙하 9.8 m/s²)보다 한참 느리지만, 복셀 폭포는 느리게 흘러야
 * 물줄기로 보이고 빠르면 노이즈가 된다.
 */
const WATERFALL_FLOW_SPEED = 0.9;

interface IslandProps {
  /**
   * 완성된 지형을 담아 둘 상자.
   *
   * 상태가 아니라 ref 인 이유는 이동 적분기가 `useFrame` 안에서 읽기 때문이다.
   * 상태로 올리면 GLB 가 도착할 때 씬 전체가 한 번 다시 그려진다.
   */
  terrainRef: RefObject<SpaceTerrain>;
  /** 지형이 준비되면 카메라 쪽에서도 쓸 수 있게 넘긴다. */
  onReadyTerrain: (terrain: IslandTerrain) => void;
  hasRealtimeShadows: boolean;
  /** 랜턴 위치 목록. 조명이 플레이어 근처만 골라 켠다. */
  onReadyLanterns: (anchors: readonly LanternAnchor[]) => void;
}

function Island({
  terrainRef,
  onReadyTerrain,
  onReadyLanterns,
  hasRealtimeShadows,
}: IslandProps): ReactNode {
  // region [Hooks]
  const { scene, collisionGeometry, waterfallMaps, lanternAnchors } = useIslandModel();
  const terrain = useMemo(() => createIslandTerrain(collisionGeometry), [collisionGeometry]);
  // endregion

  // region [Privates]
  /**
   * 지형 블록이 아바타 그림자를 받게 한다.
   *
   * **섬 자신은 그림자를 드리우지 않는다**(`castShadow` 를 켜지 않는다). 표시용
   * 메시가 8만 tri 라 그림자 맵에 한 번 더 그리면 드로우 비용이 두 배가 되는데,
   * 복셀 블록은 이미 버텍스컬러에 면별 음영이 구워져 있어 입체감이 충분하다.
   * 실시간 그림자가 실제로 의미 있는 것은 **움직이는 아바타**뿐이다.
   */
  const applyShadowFlags = (): void => {
    scene.traverse((object: Object3D) => {
      const mesh = object as Mesh;

      if (!mesh.isMesh || mesh.name === ISLAND_NODE_NAMES.collision) {
        return;
      }

      mesh.receiveShadow = hasRealtimeShadows && mesh.name === ISLAND_NODE_NAMES.blocks;
    });
  };
  // endregion

  // region [Life Cycles]
  useEffect(applyShadowFlags, [scene, hasRealtimeShadows]);

  useEffect(() => {
    terrainRef.current = terrain;
    onReadyTerrain(terrain);
  }, [terrain, terrainRef, onReadyTerrain]);

  useEffect(() => {
    onReadyLanterns(lanternAnchors);
  }, [lanternAnchors, onReadyLanterns]);

  useFrame((_, deltaSeconds) => {
    for (const map of waterfallMaps) {
      // 위로 흘리면 물이 거슬러 오른다. 음수로 내려야 떨어지는 방향이다.
      map.offset.y -= deltaSeconds * WATERFALL_FLOW_SPEED;
    }
  });
  // endregion

  // `dispose={null}` 로 useGLTF 캐시가 들고 있는 지오메트리·머티리얼이
  // 언마운트에서 해제되지 않게 막는다. 해제하면 다시 들어올 때 빈 섬이 뜬다.
  return <primitive object={scene} dispose={null} />;
}

const MemoizedIsland = memo(Island);
MemoizedIsland.displayName = "Island";

export default MemoizedIsland;
