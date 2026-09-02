"use client";

import { type ReactNode, useMemo } from "react";
import type { OrderFlowSnapshot } from "@/entities/order-flow";
import { isDev } from "@/shared/utils/common";
import { resolveToggleClass } from "../lib/toggleButtonClass";
import { WarDiagnosticsPanel } from "./WarDiagnosticsPanel";

interface WarDiagnosticsSectionProps {
  snapshot: OrderFlowSnapshot;
  activeObjectCount: number;
  isPaused: boolean;
  isOpen: boolean;
  onClickTogglePause: () => void;
  onClickToggleDiagnostics: () => void;
}

/**
 * 개발용 조작과 진단 패널을 묶은 페이지 최하단 블록.
 *
 * 일시정지는 화면이 너무 빨라 눈으로 좇기 어려울 때 멈춰 놓고 들여다보는 개발용 장치라
 * 진단과 같은 자리에 둔다. 일반 사용자에게는 둘 다 의미가 없어 개발 서버에서만 렌더한다.
 *
 * `isDev` 는 빌드 시점에 고정되는 상수여서 서버와 클라이언트 렌더 결과가 같고,
 * 하이드레이션이 어긋나지 않는다. 운영 빌드에는 이 블록이 아예 없으므로 `isPaused` 는
 * 계속 `false`, `isDiagnosticsOpen` 도 계속 `false` 로 남는다. 덕분에 캔버스는 멈추지
 * 않고 활성 객체 수도 보고하지 않는다.
 */
export function WarDiagnosticsSection({
  snapshot,
  activeObjectCount,
  isPaused,
  isOpen,
  onClickTogglePause,
  onClickToggleDiagnostics,
}: WarDiagnosticsSectionProps): ReactNode {
  //#region [Templates]
  const DiagnosticsPanelTemplate = useMemo((): ReactNode => {
    if (!isOpen) {
      return null;
    }

    return <WarDiagnosticsPanel snapshot={snapshot} activeObjectCount={activeObjectCount} />;
  }, [isOpen, snapshot, activeObjectCount]);
  //#endregion

  if (!isDev) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2" aria-label="개발용 진단">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={resolveToggleClass(isPaused)}
          aria-pressed={isPaused}
          onClick={onClickTogglePause}
        >
          {isPaused ? "재생" : "일시정지"}
        </button>
        <button
          type="button"
          className={resolveToggleClass(isOpen)}
          aria-pressed={isOpen}
          onClick={onClickToggleDiagnostics}
        >
          진단
        </button>
      </div>

      {DiagnosticsPanelTemplate}
    </section>
  );
}
