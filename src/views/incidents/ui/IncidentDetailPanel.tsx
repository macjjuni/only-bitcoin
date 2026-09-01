import { ChevronDown, SquareArrowOutUpRight } from "lucide-react";
import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  calculateIncidentAmountRatio,
  formatIncidentFullDate,
  type IncidentEvent,
  incidentTypeLabels,
} from "../model/incidents";
import {
  createIncidentDetailPanelId,
  createIncidentTimelineTabId,
  incidentTypeColorTokens,
} from "./incidentConstants";

interface IncidentDetailPanelProps {
  incident: IncidentEvent;
  isActive: boolean;
}

export const IncidentDetailPanel = memo(function IncidentDetailPanel({
  incident,
  isActive,
}: IncidentDetailPanelProps): ReactNode {
  //#region [Hooks]
  const detailParagraphReference = useRef<HTMLParagraphElement>(null);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [isDetailOverflowing, setIsDetailOverflowing] = useState(false);
  //#endregion

  //#region [Privates]
  /**
   * 접힌 문단의 실제 높이와 잘린 높이를 비교해 3줄을 넘겼는지 판별한다.
   *
   * 펼친 상태에서는 잘림이 없어 비교가 무의미하므로 직전 결과를 유지한다.
   */
  const detectDetailOverflow = useCallback((): void => {
    const detailParagraphElement = detailParagraphReference.current;

    if (!detailParagraphElement || isDetailExpanded) {
      return;
    }

    setIsDetailOverflowing(
      detailParagraphElement.scrollHeight > detailParagraphElement.clientHeight + 1,
    );
  }, [isDetailExpanded]);

  const resetInactiveDetailPanel = useCallback((): void => {
    setIsDetailExpanded(false);
    setIsDetailOverflowing(false);
  }, []);
  //#endregion

  //#region [Events]
  const onClickToggleDetail = (): void => {
    setIsDetailExpanded((previousDetailExpanded) => !previousDetailExpanded);
  };
  //#endregion

  //#region [Life Cycles]
  /** 다시 활성화될 때 항상 접힌 상태에서 시작하도록 비활성화 시 상태를 초기화한다. */
  useEffect(() => {
    if (isActive) {
      return;
    }

    resetInactiveDetailPanel();
  }, [isActive, resetInactiveDetailPanel]);

  /** 활성 패널 하나만 관찰해 글꼴 로딩과 가로폭 변화로 달라지는 줄 수를 판별한다. */
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const detailParagraphElement = detailParagraphReference.current;

    if (!detailParagraphElement) {
      return;
    }

    detectDetailOverflow();
    const detailResizeObserver = new ResizeObserver(detectDetailOverflow);
    detailResizeObserver.observe(detailParagraphElement);

    return (): void => {
      detailResizeObserver.disconnect();
    };
  }, [isActive, detectDetailOverflow]);
  //#endregion

  //#region [Templates]
  const incidentTypeColorToken = incidentTypeColorTokens[incident.type];
  const hasEstimatedAmount = typeof incident.amount === "number";
  const timelineTabId = createIncidentTimelineTabId(incident.id);
  const detailPanelId = createIncidentDetailPanelId(incident.id);
  const detailParagraphId = `incident-detail-text-${incident.id}`;
  const detailPanelDisplayClassName = isActive ? "flex" : "";

  const DamageAmountTemplate = hasEstimatedAmount ? (
    <div className="flex items-center gap-2.5">
      <div
        className="h-[5px] min-w-[60px] flex-1 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--incident-track)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${calculateIncidentAmountRatio(incident.amount) * 100}%`,
            backgroundColor: incidentTypeColorToken.accent,
          }}
        />
      </div>
      <span
        className="min-w-0 break-keep text-right text-[12px] font-medium leading-tight
          tabular-nums"
      >
        {incident.amountText}
      </span>
    </div>
  ) : (
    <span className="text-[12px] leading-none" style={{ color: "var(--incident-text-muted)" }}>
      {incident.amountText}
    </span>
  );

  /** 넘침 판별이 하이드레이션 이후라 버튼 등장으로 아래 요소가 밀리지 않게 높이를 미리 잡는다. */
  const DetailToggleTemplate = (
    <div className="min-h-[13px]">
      {isDetailOverflowing ? (
        <button
          type="button"
          onClick={onClickToggleDetail}
          aria-expanded={isDetailExpanded}
          aria-controls={detailParagraphId}
          className="inline-flex w-fit items-center gap-0.5 text-[12px] font-medium leading-none
            transition-opacity hover:opacity-75"
          style={{ color: incidentTypeColorToken.badgeForeground }}
        >
          {isDetailExpanded ? "접기" : "더보기"}
          <ChevronDown
            size={13}
            className={`transition-transform ${isDetailExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      ) : null}
    </div>
  );

  const DetailTemplate = incident.detail ? (
    <div
      className="flex flex-col items-start gap-1.5 border-t pt-3"
      style={{ borderColor: "var(--incident-border)" }}
    >
      <p
        id={detailParagraphId}
        ref={detailParagraphReference}
        className={`text-[13px] leading-[1.6] ${isDetailExpanded ? "" : "line-clamp-3"}`}
        style={{ color: "var(--incident-text-secondary)" }}
      >
        {incident.detail}
      </p>
      {DetailToggleTemplate}
    </div>
  ) : null;
  //#endregion

  return (
    <section
      id={detailPanelId}
      role="tabpanel"
      aria-labelledby={timelineTabId}
      hidden={!isActive}
      className={`${detailPanelDisplayClassName} min-h-64 flex-col gap-2.5 px-1`}
      style={{ color: "var(--incident-text)" }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="font-number text-[12px] leading-none tabular-nums"
          style={{ color: "var(--incident-text-muted)" }}
        >
          {formatIncidentFullDate(incident.date)}
        </span>
        <span
          className="inline-flex items-center rounded px-1.5 py-[3px] text-[11px] font-medium
            leading-none"
          style={{
            backgroundColor: incidentTypeColorToken.badgeBackground,
            color: incidentTypeColorToken.badgeForeground,
          }}
        >
          {incidentTypeLabels[incident.type]}
        </span>
        {incident.tags?.map((incidentTag) => (
          <span
            key={incidentTag}
            className="inline-flex items-center rounded border px-1.5 py-[3px] text-[11px]
              font-medium leading-[1.05]"
            style={{
              borderColor: "var(--incident-border)",
              color: "var(--incident-text-secondary)",
            }}
          >
            {incidentTag}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-[20px] font-bold leading-tight tracking-[-0.3px]">{incident.name}</h2>
        <span className="text-[13px] leading-none" style={{ color: "var(--incident-text-muted)" }}>
          {incident.country}
        </span>
      </div>

      <p className="text-[13px] leading-[1.5]" style={{ color: "var(--incident-text-secondary)" }}>
        {incident.summary}
      </p>

      {DamageAmountTemplate}
      {DetailTemplate}
      <a
        href={incident.article}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center gap-1 rounded-full border px-3 py-1.5
          text-xs font-medium leading-none transition-opacity hover:opacity-75"
        style={{
          borderColor: incidentTypeColorToken.badgeForeground,
          color: incidentTypeColorToken.badgeForeground,
        }}
      >
        관련 기사
        <SquareArrowOutUpRight size={12} />
      </a>
    </section>
  );
});
