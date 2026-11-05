"use client";

import { memo, type ReactNode, type RefObject, useEffect, useMemo } from "react";
import { SPACE_HALL, type SpaceTerrain } from "@/entities/space";
import { type LanternAnchor, useHallModel } from "@/views/space/lib/hallModel";
import { createHallTerrain, type HallTerrain } from "@/views/space/lib/hallTerrain";

interface HallProps {
  /**
   * 완성된 지형을 담아 둘 상자.
   *
   * 이동 적분기가 `useFrame` 안에서 읽어서 상태가 아니라 ref 임. 상태로 올리면
   * GLB 가 도착할 때 씬 전체가 다시 그려짐.
   */
  terrainRef: RefObject<SpaceTerrain>;
  /** 지형이 준비되면 카메라 쪽에서도 쓸 수 있게 넘긴다. */
  onReadyTerrain: (terrain: HallTerrain) => void;
  /** 램프 위치 목록. 조명이 플레이어 근처만 골라 켠다. */
  onReadyLanterns: (anchors: readonly LanternAnchor[]) => void;
}

/**
 * 비트코인 홀 맵.
 *
 * 바닥이 라이트맵 언릿 머티리얼이라 실시간 그림자를 받지 않음. 아바타 그림자는
 * 블롭 그림자가 맡음.
 */
function Hall({ terrainRef, onReadyTerrain, onReadyLanterns }: HallProps): ReactNode {
  // region [Hooks]
  const { scene, collisionGeometry, lanternAnchors } = useHallModel();
  const terrain = useMemo(() => createHallTerrain(collisionGeometry), [collisionGeometry]);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    terrainRef.current = terrain;
    onReadyTerrain(terrain);
  }, [terrain, terrainRef, onReadyTerrain]);

  useEffect(() => {
    onReadyLanterns(lanternAnchors);
  }, [lanternAnchors, onReadyLanterns]);
  // endregion

  // `dispose={null}` 로 로더 캐시의 지오메트리·머티리얼이 언마운트에서 해제되지
  // 않게 막음. 높이는 서버 `y ≥ 0` 조건 때문에 올려 씀(`SPACE_HALL`).
  return <primitive object={scene} position={[0, SPACE_HALL.mapOffsetY, 0]} dispose={null} />;
}

const MemoizedHall = memo(Hall);
MemoizedHall.displayName = "Hall";

export default MemoizedHall;
