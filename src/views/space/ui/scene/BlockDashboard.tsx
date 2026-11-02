"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { memo, type ReactNode, useEffect, useMemo, useRef } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { useBlockStore } from "@/entities/block";
import { SPACE_BLOCK_DASHBOARD } from "@/entities/space";
import {
  BLOCK_DASHBOARD_TEXTURE,
  type BlockDashboardState,
  drawBlockDashboard,
  resolveBlockDashboardState,
} from "@/views/space/lib/blockDashboardTexture";

/**
 * 유휴 상태에서 경과 시간을 다시 보는 간격.
 *
 * 블록·수수료·멤풀은 소켓이 밀어 주므로 **수신 즉시** 다시 그린다. 이 주기는
 * 아무 수신이 없는 동안 `12분 전` → `13분 전` 로 넘어가는 순간만 잡기 위한
 * 것이다. 분 단위 표시라 10초면 충분하고, 값이 그대로면 그리지도 않는다.
 */
const IDLE_CHECK_INTERVAL_SECONDS = 10;

// region [Privates]
const createDashboardTexture = (): {
  texture: CanvasTexture;
  context: CanvasRenderingContext2D | null;
} => {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = BLOCK_DASHBOARD_TEXTURE.width;
  canvasElement.height = BLOCK_DASHBOARD_TEXTURE.height;

  const texture = new CanvasTexture(canvasElement);
  texture.colorSpace = SRGBColorSpace;

  return { texture, context: canvasElement.getContext("2d") };
};

/** 같은 값이면 다시 칠하지 않는다. 캔버스 갱신이 GPU 업로드를 유발한다. */
const hasSameState = (left: BlockDashboardState | null, right: BlockDashboardState): boolean => {
  if (!left) {
    return false;
  }

  return (
    left.height === right.height &&
    left.poolName === right.poolName &&
    left.subsidy === right.subsidy &&
    left.nextHalvingHeight === right.nextHalvingHeight &&
    left.blocksToHalving === right.blocksToHalving &&
    // 경과는 분이 바뀔 때만 다시 그린다.
    Math.floor((left.elapsedSeconds ?? -1) / 60) === Math.floor((right.elapsedSeconds ?? -1) / 60)
  );
};
// endregion

/**
 * 전광판 오른쪽 비트코인 블록 현황판.
 *
 * 데이터는 전역 `Initializer` 가 띄운 mempool.space 소켓이 이미 `blockStore` 에
 * 넣고 있다. 이 패널은 그 스토어를 읽기만 하므로 `/space` 전용 데이터 레이어를
 * 만들지 않는다. 전광판 가격과 같은 방침이다(§2).
 *
 * 소켓이 값을 밀어 주면 **다음 프레임에 바로** 다시 그린다. 폴링으로 늦추면
 * 새 블록이 뜨는 순간이 밀린다. 다만 React 구독(`useBlockStore()`)으로 받지
 * 않는다 — 블록·수수료·멤풀이 각자 다른 주기로 들어오므로 그때마다 씬 전체가
 * 리렌더된다. 스토어 변경 알림만 ref 로 받고 그리기는 프레임 루프에서 한다.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function BlockDashboard(): ReactNode {
  // region [Hooks]
  const renderer = useThree((rootState) => rootState.gl);
  const surface = useMemo(() => createDashboardTexture(), []);
  const lastStateRef = useRef<BlockDashboardState | null>(null);
  const elapsedSinceCheckRef = useRef<number>(IDLE_CHECK_INTERVAL_SECONDS);
  /** 소켓 수신 플래그. 다음 프레임에 바로 그린다. */
  const hasPendingUpdateRef = useRef<boolean>(true);
  // endregion


  // region [Privates]
  const redrawIfChanged = (): void => {
    const { context, texture } = surface;

    if (!context) {
      return;
    }

    const { blockData } = useBlockStore.getState();
    const nextState = resolveBlockDashboardState(blockData, Date.now());

    if (hasSameState(lastStateRef.current, nextState)) {
      return;
    }

    drawBlockDashboard(context, nextState);
    lastStateRef.current = nextState;
    texture.needsUpdate = true;
  };
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    // 패널보다 큰 텍스처라 항상 축소되어 그려진다. 기본 이방성(1)이면 뭉개진다.
    surface.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    surface.texture.needsUpdate = true;

    return () => {
      surface.texture.dispose();
    };
  }, [surface, renderer]);

  useEffect(() => {
    // 스토어 구독을 훅이 아니라 직접 건다. `useBlockStore()` 로 받으면 블록·
    // 수수료·멤풀이 각자 다른 주기로 들어올 때마다 씬 전체가 리렌더된다.
    return useBlockStore.subscribe(() => {
      hasPendingUpdateRef.current = true;
    });
  }, []);

  useFrame((_rootState, deltaSeconds) => {
    elapsedSinceCheckRef.current += deltaSeconds;

    const hasIdleCheckDue = elapsedSinceCheckRef.current >= IDLE_CHECK_INTERVAL_SECONDS;

    if (!hasPendingUpdateRef.current && !hasIdleCheckDue) {
      return;
    }

    hasPendingUpdateRef.current = false;
    elapsedSinceCheckRef.current = 0;
    redrawIfChanged();
  });
  // endregion

  // 테두리 메시를 두지 않는다. 맵의 금장 액자가 이미 테두리라, 그 안에 또
  // 테두리를 넣으면 액자 안쪽 홈이 두 겹이 된다.
  return (
    <mesh>
      <planeGeometry args={[SPACE_BLOCK_DASHBOARD.width, SPACE_BLOCK_DASHBOARD.height]} />
      {/* 자체 발광으로 그린다. 조명에 맡기면 노을 역광에서 글자가 어두워진다. */}
      <meshBasicMaterial map={surface.texture} toneMapped={false} />
    </mesh>
  );
}
// endregion

const MemoizedBlockDashboard = memo(BlockDashboard);
MemoizedBlockDashboard.displayName = "BlockDashboard";

export default MemoizedBlockDashboard;
