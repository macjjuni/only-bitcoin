"use client";

import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useOrderFlowStore } from "@/entities/order-flow";
import { useOrderFlow } from "@/entities/order-flow/client";
import { PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import {
  type BattleRendererMode,
  DEFAULT_WAR_CONTROL_STATE,
  DENSITY_PROFILES,
  type EffectDensity,
  type WarControlState,
} from "../model/warViewModel";
import { BattleCanvas } from "./BattleCanvas";
import { SpaceBattleCanvas } from "./SpaceBattleCanvas";
import { WarControls } from "./WarControls";
import { WarDiagnosticsSection } from "./WarDiagnosticsSection";
import { WarDisclaimer } from "./WarDisclaimer";
import { WarHud } from "./WarHud";

/**
 * BTC 매수·매도 전장 화면.
 *
 * 실시간 데이터는 세 갈래로 흐른다. 커넥터가 자기 버퍼에 쌓고, HUD 는 커밋 주기마다
 * 요약본 하나만 받고, 캔버스는 커넥터를 직접 읽는다. 그래서 체결이 아무리 많이 쏟아져도
 * 이 컴포넌트가 리렌더되는 것은 조작 상태가 바뀌거나 HUD 스냅샷이 갱신될 때뿐이다.
 */
export default function WarScreen(): ReactNode {
  //#region [Hooks]
  const [controlState, setControlState] = useState<WarControlState>(DEFAULT_WAR_CONTROL_STATE);
  const [activeObjectCount, setActiveObjectCount] = useState(0);
  const snapshot = useOrderFlowStore((store) => store.snapshot);

  useOrderFlow(DENSITY_PROFILES[controlState.effectDensity].hudCommitIntervalInMs);
  //#endregion

  //#region [Privates]
  /** 조작 상태 일부만 바꿔 끼운다. */
  const updateControlState = useCallback((partialState: Partial<WarControlState>): void => {
    setControlState((previousControlState) => ({ ...previousControlState, ...partialState }));
  }, []);
  //#endregion

  //#region [Events]
  const onChangeEffectDensity = useCallback(
    (effectDensity: EffectDensity): void => {
      updateControlState({ effectDensity });
    },
    [updateControlState],
  );

  const onClickTogglePause = useCallback((): void => {
    setControlState((previousControlState) => ({
      ...previousControlState,
      isPaused: !previousControlState.isPaused,
    }));
  }, []);

  const onClickToggleDiagnostics = useCallback((): void => {
    setControlState((previousControlState) => ({
      ...previousControlState,
      isDiagnosticsOpen: !previousControlState.isDiagnosticsOpen,
    }));
  }, []);

  const onChangeRendererMode = useCallback(
    (rendererMode: BattleRendererMode): void => {
      updateControlState({ rendererMode });
    },
    [updateControlState],
  );

  const onChangeActiveObjectCount = useCallback((nextActiveObjectCount: number): void => {
    setActiveObjectCount(nextActiveObjectCount);
  }, []);
  //#endregion

  //#region [Templates]
  /**
   * 두 렌더러는 같은 자리를 차지하지만 각자 엔진과 프레임 루프를 들고 있다. 전환할 때
   * 컴포넌트가 통째로 갈리면서 이전 루프가 정리되고 전투도 새로 시작된다.
   */
  const BattleCanvasTemplate = useMemo(() => {
    if (controlState.rendererMode === "classic") {
      return (
        <BattleCanvas
          controlState={controlState}
          onChangeActiveObjectCount={onChangeActiveObjectCount}
        />
      );
    }

    return (
      <SpaceBattleCanvas
        controlState={controlState}
        onChangeActiveObjectCount={onChangeActiveObjectCount}
      />
    );
  }, [controlState, onChangeActiveObjectCount]);
  //#endregion

  return (
    <PageLayout className="gap-3">
      <PageTitle label="BTC WAR" title="War" description="실시간 호가와 체결 전쟁" />

      {BattleCanvasTemplate}

      <WarControls
        controlState={controlState}
        onChangeEffectDensity={onChangeEffectDensity}
        onChangeRendererMode={onChangeRendererMode}
      />

      <WarHud snapshot={snapshot} />

      <WarDisclaimer />

      <WarDiagnosticsSection
        snapshot={snapshot}
        activeObjectCount={activeObjectCount}
        isPaused={controlState.isPaused}
        isOpen={controlState.isDiagnosticsOpen}
        onClickTogglePause={onClickTogglePause}
        onClickToggleDiagnostics={onClickToggleDiagnostics}
      />
    </PageLayout>
  );
}
