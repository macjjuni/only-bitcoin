"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { PageLayout } from "@/shared/ui/layout";
import {
  calculateIncidentAmountRatio,
  calculateTimelineNodeDiameter,
  firstIncidentYear,
  formatIncidentFullDate,
  formatIncidentShortDate,
  type IncidentEvent,
  type IncidentType,
  type IncidentYearAnchor,
  incidentEvents,
  incidentsUpdatedAt,
  incidentTypeLabels,
  incidentYearAnchors,
  lastIncidentYear,
  totalIncidentCount,
} from "../model/incidents";

const scopedIncidentStyles = `
.incidents {
  --incident-text: #17181a;
  --incident-text-secondary: #5c6066;
  --incident-text-muted: #666d76;
  --incident-axis: #d8dce2;
  --incident-guide: #c8cdd5;
  --incident-track: #eceef2;
  --incident-border: #dcdfe5;
  --incident-chip-background: #eceef2;

  --incident-hack-background: #fdeceb;
  --incident-hack-foreground: #8c2f26;
  --incident-hack-accent: #e4574c;

  --incident-halt-background: #efeafa;
  --incident-halt-foreground: #442a8a;
  --incident-halt-accent: #7c5cd6;

  --incident-protocol-background: #e2f2f0;
  --incident-protocol-foreground: #10514c;
  --incident-protocol-accent: #2b9c92;

  --incident-operational-background: #fbf0dd;
  --incident-operational-foreground: #6f4708;
  --incident-operational-accent: #c0821a;

  --incident-bankruptcy-background: #eceef1;
  --incident-bankruptcy-foreground: #3c434c;
  --incident-bankruptcy-accent: #78828f;
}

:where(.dark) .incidents {
  --incident-text: #f2f3f5;
  --incident-text-secondary: #b5bac2;
  --incident-text-muted: #9aa1ab;
  --incident-axis: #34373d;
  --incident-guide: #4b5059;
  --incident-track: #26282c;
  --incident-border: #454951;
  --incident-chip-background: #26282c;

  --incident-hack-background: rgb(228 87 76 / 0.16);
  --incident-hack-foreground: #ff9a90;
  --incident-hack-accent: #e4574c;

  --incident-halt-background: rgb(124 92 214 / 0.18);
  --incident-halt-foreground: #bfa8ff;
  --incident-halt-accent: #8b6ce0;

  --incident-protocol-background: rgb(43 156 146 / 0.18);
  --incident-protocol-foreground: #6fd8cd;
  --incident-protocol-accent: #35b3a7;

  --incident-operational-background: rgb(192 130 26 / 0.18);
  --incident-operational-foreground: #f0c069;
  --incident-operational-accent: #d1912b;

  --incident-bankruptcy-background: rgb(120 130 143 / 0.2);
  --incident-bankruptcy-foreground: #c2c9d2;
  --incident-bankruptcy-accent: #8b95a3;
}
`;

interface IncidentTypeColorToken {
  badgeBackground: string;
  badgeForeground: string;
  accent: string;
}

const incidentTypeColorTokens: Record<IncidentType, IncidentTypeColorToken> = {
  hack: {
    badgeBackground: "var(--incident-hack-background)",
    badgeForeground: "var(--incident-hack-foreground)",
    accent: "var(--incident-hack-accent)",
  },
  halt: {
    badgeBackground: "var(--incident-halt-background)",
    badgeForeground: "var(--incident-halt-foreground)",
    accent: "var(--incident-halt-accent)",
  },
  protocol: {
    badgeBackground: "var(--incident-protocol-background)",
    badgeForeground: "var(--incident-protocol-foreground)",
    accent: "var(--incident-protocol-accent)",
  },
  operational: {
    badgeBackground: "var(--incident-operational-background)",
    badgeForeground: "var(--incident-operational-foreground)",
    accent: "var(--incident-operational-accent)",
  },
  bankruptcy: {
    badgeBackground: "var(--incident-bankruptcy-background)",
    badgeForeground: "var(--incident-bankruptcy-foreground)",
    accent: "var(--incident-bankruptcy-accent)",
  },
};

/** 후속 작업에서 쿼리 스트링 동작을 연결할 필터 목록. 이번 범위에서는 UI만 제공한다. */
const incidentFilters = [
  { label: "전체", queryString: null },
  { label: "해킹", queryString: "type=hack" },
  { label: "출금중지", queryString: "type=halt" },
  { label: "프로토콜", queryString: "type=protocol" },
  { label: "국내", queryString: "region=kr" },
] as const;

const timelineItemWidthInPixels = 76;
const timelineEdgeSpacerWidth = `calc(50% - ${timelineItemWidthInPixels / 2}px)`;
const centerDetectionThresholdRatio = 0.4;

function doesUserPreferReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface YearJumpChipProps {
  yearAnchor: IncidentYearAnchor;
  isActive: boolean;
  onSelectYear: (incidentIndex: number) => void;
}

function YearJumpChip({ yearAnchor, isActive, onSelectYear }: YearJumpChipProps): ReactNode {
  //#region [Events]
  const onClickYearJumpChip = (): void => {
    onSelectYear(yearAnchor.incidentIndex);
  };
  //#endregion

  return (
    <button
      type="button"
      onClick={onClickYearJumpChip}
      aria-current={isActive ? "true" : undefined}
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1.5 font-number
        text-[12px] leading-none tabular-nums transition-colors duration-[160ms] ease-[ease]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={
        isActive
          ? {
              backgroundColor: "var(--incident-text)",
              color: "hsl(var(--background))",
              outlineColor: "var(--incident-text)",
            }
          : {
              backgroundColor: "var(--incident-chip-background)",
              color: "var(--incident-text-secondary)",
              outlineColor: "var(--incident-text)",
            }
      }
    >
      {yearAnchor.year}
    </button>
  );
}

interface TimelineIncidentNodeProps {
  incident: IncidentEvent;
  incidentIndex: number;
  isActive: boolean;
  isFirstIncidentOfYear: boolean;
  onRegisterTimelineNode: (
    incidentIndex: number,
    timelineNodeElement: HTMLButtonElement | null,
  ) => void;
  onSelectIncident: (incidentIndex: number) => void;
  onNavigateIncident: (incidentIndex: number, direction: -1 | 1) => void;
}

function TimelineIncidentNode({
  incident,
  incidentIndex,
  isActive,
  isFirstIncidentOfYear,
  onRegisterTimelineNode,
  onSelectIncident,
  onNavigateIncident,
}: TimelineIncidentNodeProps): ReactNode {
  //#region [Hooks]
  const onAssignTimelineNodeReference = useCallback(
    (timelineNodeElement: HTMLButtonElement | null): void => {
      onRegisterTimelineNode(incidentIndex, timelineNodeElement);
    },
    [incidentIndex, onRegisterTimelineNode],
  );
  //#endregion

  //#region [Events]
  const onFocusTimelineNode = (): void => {
    onSelectIncident(incidentIndex);
  };

  const onClickTimelineNode = (): void => {
    onSelectIncident(incidentIndex);
  };

  const onKeyDownTimelineNode = (keyboardEvent: KeyboardEvent<HTMLButtonElement>): void => {
    if (keyboardEvent.key !== "ArrowLeft" && keyboardEvent.key !== "ArrowRight") {
      return;
    }

    keyboardEvent.preventDefault();
    const navigationDirection = keyboardEvent.key === "ArrowRight" ? 1 : -1;
    onNavigateIncident(incidentIndex, navigationDirection);
  };
  //#endregion

  //#region [Templates]
  const incidentYear = incident.date.slice(0, 4);
  const timelineNodeDiameterInPixels = calculateTimelineNodeDiameter(incident.amount);
  const incidentTypeColorToken = incidentTypeColorTokens[incident.type];
  //#endregion

  return (
    <div
      className="flex h-full shrink-0 snap-center flex-col items-center justify-center gap-2"
      style={{ width: timelineItemWidthInPixels }}
    >
      <span
        aria-hidden={!isFirstIncidentOfYear}
        className="h-3 font-number text-[11px] font-medium leading-none tabular-nums"
        style={{
          color: isFirstIncidentOfYear ? "var(--incident-text-secondary)" : "transparent",
        }}
      >
        {isFirstIncidentOfYear ? incidentYear : ""}
      </span>

      <span className="relative flex h-7 w-full items-center justify-center">
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-px"
          style={{ backgroundColor: "var(--incident-axis)" }}
        />
        <button
          ref={onAssignTimelineNodeReference}
          type="button"
          tabIndex={0}
          aria-label={`${formatIncidentFullDate(incident.date)} ${incident.name}`}
          aria-current={isActive ? "true" : undefined}
          onFocus={onFocusTimelineNode}
          onClick={onClickTimelineNode}
          onKeyDown={onKeyDownTimelineNode}
          className="relative z-[1] flex h-7 w-7 touch-manipulation items-center justify-center
            rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ outlineColor: "var(--incident-text)" }}
        >
          <span
            aria-hidden
            className="block rounded-full"
            style={{
              width: timelineNodeDiameterInPixels,
              height: timelineNodeDiameterInPixels,
              backgroundColor: incidentTypeColorToken.accent,
              opacity: isActive ? 1 : 0.4,
              transform: isActive ? "scale(1.5)" : "scale(1)",
              transition: "transform 160ms ease, opacity 160ms ease",
            }}
          />
        </button>
      </span>

      <span
        className="font-number text-[11px] leading-none tabular-nums"
        style={{
          color: isActive ? "var(--incident-text)" : "var(--incident-text-muted)",
          transition: "color 160ms ease",
        }}
      >
        {formatIncidentShortDate(incident.date)}
      </span>
    </div>
  );
}

interface IncidentDetailPanelProps {
  activeIncident: IncidentEvent;
}

function IncidentDetailPanel({ activeIncident }: IncidentDetailPanelProps): ReactNode {
  //#region [Templates]
  const activeIncidentTypeColorToken = incidentTypeColorTokens[activeIncident.type];
  const hasEstimatedAmount = typeof activeIncident.amount === "number";

  const DamageAmountTemplate = hasEstimatedAmount ? (
    <div className="flex items-center gap-2.5">
      <div
        className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--incident-track)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${calculateIncidentAmountRatio(activeIncident.amount) * 100}%`,
            backgroundColor: activeIncidentTypeColorToken.accent,
          }}
        />
      </div>
      <span className="shrink-0 text-[12px] font-medium leading-none tabular-nums">
        {activeIncident.amountText}
      </span>
    </div>
  ) : (
    <span className="text-[12px] leading-none" style={{ color: "var(--incident-text-muted)" }}>
      {activeIncident.amountText}
    </span>
  );

  const DetailTemplate = activeIncident.detail ? (
    <p
      className="border-t pt-3 text-[13px] leading-[1.6]"
      style={{
        borderColor: "var(--incident-border)",
        color: "var(--incident-text-secondary)",
      }}
    >
      {activeIncident.detail}
    </p>
  ) : null;
  //#endregion

  return (
    <section
      aria-live="polite"
      aria-atomic="true"
      className="flex min-h-72 flex-col gap-2.5 px-1"
      style={{ color: "var(--incident-text)" }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="font-number text-[12px] leading-none tabular-nums"
          style={{ color: "var(--incident-text-muted)" }}
        >
          {formatIncidentFullDate(activeIncident.date)}
        </span>
        <span
          className="inline-flex items-center rounded px-1.5 py-[3px] text-[11px] font-medium
            leading-none"
          style={{
            backgroundColor: activeIncidentTypeColorToken.badgeBackground,
            color: activeIncidentTypeColorToken.badgeForeground,
          }}
        >
          {incidentTypeLabels[activeIncident.type]}
        </span>
        {activeIncident.tags?.map((incidentTag) => (
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
        <h2 className="text-[20px] font-bold leading-tight tracking-[-0.3px]">
          {activeIncident.name}
        </h2>
        <span className="text-[13px] leading-none" style={{ color: "var(--incident-text-muted)" }}>
          {activeIncident.country}
        </span>
      </div>

      <p className="text-[13px] leading-[1.5]" style={{ color: "var(--incident-text-secondary)" }}>
        {activeIncident.summary}
      </p>

      {DamageAmountTemplate}
      {DetailTemplate}

      <a
        href={activeIncident.article}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto w-fit text-[13px] font-medium leading-none underline underline-offset-2"
        style={{ color: activeIncidentTypeColorToken.badgeForeground }}
      >
        관련 기사
      </a>
    </section>
  );
}

export default function IncidentsScreen(): ReactNode {
  //#region [Hooks]
  const timelineTrackReference = useRef<HTMLElement>(null);
  const timelineNodeReferences = useRef<Array<HTMLButtonElement | null>>([]);
  const detectionAnimationFrameReference = useRef<number | null>(null);
  const activeIncidentIndexReference = useRef(0);
  const [activeIncidentIndex, setActiveIncidentIndex] = useState(0);

  const detectCenteredIncident = useCallback((): void => {
    const timelineTrackElement = timelineTrackReference.current;

    if (!timelineTrackElement) {
      return;
    }

    const timelineTrackRectangle = timelineTrackElement.getBoundingClientRect();
    const timelineTrackCenterPosition =
      timelineTrackRectangle.left + timelineTrackRectangle.width / 2;
    const centerDetectionThreshold = timelineTrackRectangle.width * centerDetectionThresholdRatio;
    let nearestIncidentIndex = -1;
    let nearestIncidentDistanceInPixels = Number.POSITIVE_INFINITY;

    timelineNodeReferences.current.forEach((timelineNodeElement, incidentIndex) => {
      if (!timelineNodeElement) {
        return;
      }

      const timelineNodeRectangle = timelineNodeElement.getBoundingClientRect();
      const timelineNodeCenterPosition =
        timelineNodeRectangle.left + timelineNodeRectangle.width / 2;
      const distanceFromTrackCenterInPixels = Math.abs(
        timelineNodeCenterPosition - timelineTrackCenterPosition,
      );

      if (
        distanceFromTrackCenterInPixels <= centerDetectionThreshold &&
        distanceFromTrackCenterInPixels < nearestIncidentDistanceInPixels
      ) {
        nearestIncidentIndex = incidentIndex;
        nearestIncidentDistanceInPixels = distanceFromTrackCenterInPixels;
      }
    });

    if (
      nearestIncidentIndex === -1 ||
      nearestIncidentIndex === activeIncidentIndexReference.current
    ) {
      return;
    }

    activeIncidentIndexReference.current = nearestIncidentIndex;
    setActiveIncidentIndex(nearestIncidentIndex);
  }, []);

  const scheduleCenteredIncidentDetection = useCallback((): void => {
    if (detectionAnimationFrameReference.current !== null) {
      return;
    }

    detectionAnimationFrameReference.current = window.requestAnimationFrame(() => {
      detectionAnimationFrameReference.current = null;
      detectCenteredIncident();
    });
  }, [detectCenteredIncident]);

  const scrollIncidentToCenter = useCallback((incidentIndex: number): void => {
    const timelineTrackElement = timelineTrackReference.current;
    const timelineNodeElement = timelineNodeReferences.current[incidentIndex];

    if (!timelineTrackElement || !timelineNodeElement) {
      return;
    }

    const timelineTrackRectangle = timelineTrackElement.getBoundingClientRect();
    const timelineNodeRectangle = timelineNodeElement.getBoundingClientRect();
    const timelineTrackCenterPosition =
      timelineTrackRectangle.left + timelineTrackRectangle.width / 2;
    const timelineNodeCenterPosition = timelineNodeRectangle.left + timelineNodeRectangle.width / 2;
    const distanceFromTrackCenterInPixels =
      timelineNodeCenterPosition - timelineTrackCenterPosition;

    timelineTrackElement.scrollTo({
      left: timelineTrackElement.scrollLeft + distanceFromTrackCenterInPixels,
      behavior: doesUserPreferReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  const registerTimelineNode = useCallback(
    (incidentIndex: number, timelineNodeElement: HTMLButtonElement | null): void => {
      timelineNodeReferences.current[incidentIndex] = timelineNodeElement;
    },
    [],
  );

  const selectTimelineIncident = useCallback(
    (incidentIndex: number): void => {
      scrollIncidentToCenter(incidentIndex);
    },
    [scrollIncidentToCenter],
  );

  const navigateTimelineIncident = useCallback((incidentIndex: number, direction: -1 | 1): void => {
    const nextIncidentIndex = Math.min(
      Math.max(incidentIndex + direction, 0),
      totalIncidentCount - 1,
    );
    const nextTimelineNodeElement = timelineNodeReferences.current[nextIncidentIndex];

    nextTimelineNodeElement?.focus({ preventScroll: true });
  }, []);
  //#endregion

  //#region [Events]
  const onSelectYearJumpChip = (incidentIndex: number): void => {
    scrollIncidentToCenter(incidentIndex);
  };
  //#endregion

  //#region [Life Cycles]
  useEffect(() => {
    const timelineTrackElement = timelineTrackReference.current;

    if (!timelineTrackElement) {
      return;
    }

    detectCenteredIncident();
    timelineTrackElement.addEventListener("scroll", scheduleCenteredIncidentDetection, {
      passive: true,
    });
    window.addEventListener("resize", scheduleCenteredIncidentDetection);

    return () => {
      timelineTrackElement.removeEventListener("scroll", scheduleCenteredIncidentDetection);
      window.removeEventListener("resize", scheduleCenteredIncidentDetection);

      if (detectionAnimationFrameReference.current !== null) {
        window.cancelAnimationFrame(detectionAnimationFrameReference.current);
      }
    };
  }, [detectCenteredIncident, scheduleCenteredIncidentDetection]);
  //#endregion

  //#region [Templates]
  const activeIncident = incidentEvents[activeIncidentIndex];
  const activeIncidentYear = activeIncident.date.slice(0, 4);
  //#endregion

  return (
    <PageLayout>
      <div className="incidents flex flex-col gap-4 font-pretendard">
        <style>{scopedIncidentStyles}</style>

        <header className="flex flex-col gap-2 px-1 pt-1">
          <h1
            className="text-[22px] font-bold leading-none tracking-[-0.5px]"
            style={{ color: "var(--incident-text)" }}
          >
            거래소 사고 연표
          </h1>
          <p className="text-[13px] leading-none" style={{ color: "var(--incident-text-muted)" }}>
            {firstIncidentYear} – {lastIncidentYear} · {totalIncidentCount}건
          </p>
        </header>

        <div className="scrollbar-hide flex gap-1.5 overflow-x-auto px-1">
          {incidentFilters.map((incidentFilter) => {
            const isActiveFilter = incidentFilter.queryString === null;

            return (
              <span
                key={incidentFilter.label}
                className="inline-flex shrink-0 items-center rounded-full px-3 py-[7px]
                  text-[13px] leading-none"
                style={
                  isActiveFilter
                    ? {
                        backgroundColor: "var(--incident-text)",
                        color: "hsl(var(--background))",
                      }
                    : {
                        backgroundColor: "var(--incident-chip-background)",
                        color: "var(--incident-text-secondary)",
                      }
                }
              >
                {incidentFilter.label}
              </span>
            );
          })}
        </div>

        <nav
          aria-label="연도 바로가기"
          className="scrollbar-hide flex gap-1.5 overflow-x-auto px-1 py-0.5"
        >
          {incidentYearAnchors.map((yearAnchor) => (
            <YearJumpChip
              key={yearAnchor.year}
              yearAnchor={yearAnchor}
              isActive={yearAnchor.year === activeIncidentYear}
              onSelectYear={onSelectYearJumpChip}
            />
          ))}
        </nav>

        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-[10%] z-10 border-l
              border-dashed"
            style={{ borderColor: "var(--incident-guide)" }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-[10%] z-10 border-r
              border-dashed"
            style={{ borderColor: "var(--incident-guide)" }}
          />

          <section
            ref={timelineTrackReference}
            aria-label="거래소 사고 타임라인"
            className="scrollbar-hide flex h-[104px] snap-x snap-proximity overflow-x-auto
              overflow-y-hidden overscroll-x-contain"
          >
            <span aria-hidden className="shrink-0" style={{ width: timelineEdgeSpacerWidth }} />

            {incidentEvents.map((incident, incidentIndex) => {
              const incidentYear = incident.date.slice(0, 4);
              const previousIncident = incidentEvents[incidentIndex - 1];
              const isFirstIncidentOfYear =
                !previousIncident || previousIncident.date.slice(0, 4) !== incidentYear;

              return (
                <TimelineIncidentNode
                  key={incident.id}
                  incident={incident}
                  incidentIndex={incidentIndex}
                  isActive={incidentIndex === activeIncidentIndex}
                  isFirstIncidentOfYear={isFirstIncidentOfYear}
                  onRegisterTimelineNode={registerTimelineNode}
                  onSelectIncident={selectTimelineIncident}
                  onNavigateIncident={navigateTimelineIncident}
                />
              );
            })}

            <span aria-hidden className="shrink-0" style={{ width: timelineEdgeSpacerWidth }} />
          </section>
        </div>

        <div className="flex items-center justify-between px-1 text-[12px] leading-none">
          <span style={{ color: "var(--incident-text-muted)" }}>좌우로 밀어 사건 선택</span>
          <span
            className="font-number tabular-nums"
            style={{ color: "var(--incident-text-muted)" }}
          >
            {activeIncidentIndex + 1} / {totalIncidentCount}
          </span>
        </div>

        <IncidentDetailPanel activeIncident={activeIncident} />

        <p
          className="px-1 text-[11px] leading-none"
          style={{ color: "var(--incident-text-muted)" }}
        >
          {incidentsUpdatedAt} 기준 · 피해액은 원화 환산 추정치
        </p>
      </div>
    </PageLayout>
  );
}
