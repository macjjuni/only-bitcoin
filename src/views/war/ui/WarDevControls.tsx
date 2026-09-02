"use client";

import { type ReactNode, useMemo } from "react";
import type { OrderFlowSnapshot } from "@/entities/order-flow";
import { isDev } from "@/shared/utils/common";
import { resolveToggleClass } from "../lib/toggleButtonClass";
import type { EffectDensity } from "../model/warViewModel";
import { WarDiagnosticsPanel } from "./WarDiagnosticsPanel";

/** 디버그 패널이라 제품 UI 의 한글 라벨 대신 짧은 영문 약어를 쓴다. */
const EFFECT_DENSITY_OPTIONS: Array<{ label: string; value: EffectDensity }> = [
  { label: "Low", value: "low" },
  { label: "Med", value: "medium" },
  { label: "High", value: "high" },
];

/** 라벨 열 너비. 행이 늘어도 조작부 시작점이 흔들리지 않게 고정한다. */
const ROW_LABEL_CLASS =
  "w-16 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground";

interface WarDevControlsProps {
  snapshot: OrderFlowSnapshot;
  activeObjectCount: number;
  effectDensity: EffectDensity;
  isPaused: boolean;
  isDiagnosticsOpen: boolean;
  onChangeEffectDensity: (effectDensity: EffectDensity) => void;
  onClickTogglePause: () => void;
  onClickToggleDiagnostics: () => void;
}

/**
 * 개발용 조작과 진단을 묶은 페이지 최하단 디버그 패널.
 *
 * 효과 밀도·일시정지·진단은 모두 전장을 뜯어볼 때 쓰는 장치다. 일시정지는 화면이 너무
 * 빨라 눈으로 좇기 어려울 때 멈춰 놓고 들여다보려고, 효과 밀도는 성능 예산을 바꿔 가며
 * 프레임을 확인하려고 쓴다. 일반 사용자에게는 셋 다 의미가 없어 개발 서버에서만 렌더한다.
 *
 * 점선 테두리와 `DEBUG` 칩은 이 블록이 제품 화면의 일부가 아님을 한눈에 알리려는 것이다.
 * 실수로 운영에 노출되더라도 개발용임이 바로 읽혀야 한다.
 *
 * `isDev` 는 빌드 시점에 고정되는 상수여서 서버와 클라이언트 렌더 결과가 같고,
 * 하이드레이션이 어긋나지 않는다. 운영 빌드에는 이 블록이 아예 없으므로 `isPaused` 와
 * `isDiagnosticsOpen` 은 계속 `false`, 효과 밀도는 기본값에 머문다. 덕분에 캔버스는
 * 멈추지 않고 활성 객체 수도 보고하지 않는다.
 */
export function WarDevControls({
  snapshot,
  activeObjectCount,
  effectDensity,
  isPaused,
  isDiagnosticsOpen,
  onChangeEffectDensity,
  onClickTogglePause,
  onClickToggleDiagnostics,
}: WarDevControlsProps): ReactNode {
  //#region [Templates]
  const DiagnosticsPanelTemplate = useMemo((): ReactNode => {
    if (!isDiagnosticsOpen) {
      return null;
    }

    return <WarDiagnosticsPanel snapshot={snapshot} activeObjectCount={activeObjectCount} />;
  }, [isDiagnosticsOpen, snapshot, activeObjectCount]);
  //#endregion

  if (!isDev) {
    return null;
  }

  return (
    <section
      className="mt-1 flex flex-col gap-2.5 rounded-xl border border-dashed border-neutral-400/60 bg-neutral-200/25 p-3 dark:border-neutral-600 dark:bg-neutral-900/40"
      aria-label="개발용 조작과 진단"
    >
      <div className="flex items-center gap-2">
        <span className="rounded bg-neutral-700 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.14em] text-neutral-100 dark:bg-neutral-300 dark:text-neutral-900">
          DEBUG
        </span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          dev server only
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className={ROW_LABEL_CLASS}>Density</span>
        <div className="flex flex-wrap gap-1.5">
          {EFFECT_DENSITY_OPTIONS.map((densityOption) => (
            <button
              key={densityOption.value}
              type="button"
              className={resolveToggleClass(effectDensity === densityOption.value)}
              aria-pressed={effectDensity === densityOption.value}
              onClick={() => onChangeEffectDensity(densityOption.value)}
            >
              {densityOption.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={ROW_LABEL_CLASS}>Engine</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className={resolveToggleClass(isPaused)}
            aria-pressed={isPaused}
            onClick={onClickTogglePause}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            className={resolveToggleClass(isDiagnosticsOpen)}
            aria-pressed={isDiagnosticsOpen}
            onClick={onClickToggleDiagnostics}
          >
            Diag
          </button>
        </div>
      </div>

      {DiagnosticsPanelTemplate}
    </section>
  );
}
