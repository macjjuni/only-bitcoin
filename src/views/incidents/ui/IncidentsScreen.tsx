"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { PageTitle } from "@/shared/ui";
import { PageLayout } from "@/shared/ui/layout";
import {
  calculateMonthsBetween,
  firstIncidentYear,
  incidentEvents,
  incidentYearAnchors,
  lastIncidentYear,
  totalIncidentCount,
} from "../model/incidents";
import { IncidentDetailPanel } from "./IncidentDetailPanel";
import {
  centerDetectionThresholdRatio,
  doesUserPreferReducedMotion,
  scopedIncidentStyles,
  timelineEdgeSpacerWidth,
  timelinePixelsPerMonth,
} from "./incidentConstants";
import { TimelineIncidentNode } from "./TimelineIncidentNode";
import { YearJumpChip } from "./YearJumpChip";

export default function IncidentsScreen(): ReactNode {
  //#region [Hooks]
  const timelineTrackReference = useRef<HTMLElement>(null);
  const timelineNodeReferences = useRef<Array<HTMLButtonElement | null>>([]);
  const yearJumpNavigationReference = useRef<HTMLElement>(null);
  const yearJumpChipReferences = useRef<Record<string, HTMLButtonElement | null>>({});
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

  const registerYearJumpChip = useCallback(
    (year: string, yearJumpChipElement: HTMLButtonElement | null): void => {
      yearJumpChipReferences.current[year] = yearJumpChipElement;
    },
    [],
  );

  const scrollActiveYearChipIntoView = useCallback((activeYear: string): void => {
    const yearJumpNavigationElement = yearJumpNavigationReference.current;
    const activeYearJumpChipElement = yearJumpChipReferences.current[activeYear];

    if (!yearJumpNavigationElement || !activeYearJumpChipElement) {
      return;
    }

    const yearJumpNavigationRectangle = yearJumpNavigationElement.getBoundingClientRect();
    const activeYearJumpChipRectangle = activeYearJumpChipElement.getBoundingClientRect();
    const rightOverflowInPixels =
      activeYearJumpChipRectangle.right - yearJumpNavigationRectangle.right;
    const leftOverflowInPixels =
      activeYearJumpChipRectangle.left - yearJumpNavigationRectangle.left;

    if (rightOverflowInPixels > 0) {
      yearJumpNavigationElement.scrollTo({
        left: yearJumpNavigationElement.scrollLeft + rightOverflowInPixels + 8,
        behavior: doesUserPreferReducedMotion() ? "auto" : "smooth",
      });
      return;
    }

    if (leftOverflowInPixels < 0) {
      yearJumpNavigationElement.scrollTo({
        left: yearJumpNavigationElement.scrollLeft + leftOverflowInPixels - 8,
        behavior: doesUserPreferReducedMotion() ? "auto" : "smooth",
      });
    }
  }, []);

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

  //#region [Life Cycles]
  useEffect(() => {
    scrollActiveYearChipIntoView(activeIncidentYear);
  }, [activeIncidentYear, scrollActiveYearChipIntoView]);
  //#endregion

  return (
    <PageLayout>
      <div className="incidents flex flex-col gap-4 font-pretendard">
        <style>{scopedIncidentStyles}</style>

        <PageTitle
          label="Incidents"
          title="거래소 사고 연표"
          description="거래소 사건사고를 확인하고, 개인 셀프 커스터디의 중요성과 스스로 자산을 지켜야 한다는 경각심을 되새겨보세요."
        />

        <nav
          ref={yearJumpNavigationReference}
          aria-label="연도 바로가기"
          className="scrollbar-hide flex gap-2 overflow-x-auto -mx-2 px-2 py-0.5"
        >
          {incidentYearAnchors.map((yearAnchor) => (
            <YearJumpChip
              key={yearAnchor.year}
              yearAnchor={yearAnchor}
              isActive={yearAnchor.year === activeIncidentYear}
              onSelectYear={onSelectYearJumpChip}
              onRegisterYearJumpChip={registerYearJumpChip}
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
            className="scrollbar-hide flex h-[120px] -mx-2 snap-x rounded-lg bg-neutral-100
              dark:bg-neutral-900 py-4 snap-proximity overflow-x-auto overflow-y-hidden
              overscroll-x-contain"
            style={{ boxShadow: "var(--incident-timeline-shadow)" }}
          >
            <span aria-hidden className="shrink-0" style={{ width: timelineEdgeSpacerWidth }} />

            {incidentEvents.map((incident, incidentIndex) => {
              const previousIncident = incidentEvents[incidentIndex - 1];
              const gapInPixels = previousIncident
                ? calculateMonthsBetween(previousIncident.date, incident.date) *
                  timelinePixelsPerMonth
                : 0;

              return (
                <TimelineIncidentNode
                  key={incident.id}
                  incident={incident}
                  incidentIndex={incidentIndex}
                  isActive={incidentIndex === activeIncidentIndex}
                  gapInPixels={gapInPixels}
                  onRegisterTimelineNode={registerTimelineNode}
                  onSelectIncident={selectTimelineIncident}
                  onNavigateIncident={navigateTimelineIncident}
                />
              );
            })}

            <span aria-hidden className="shrink-0" style={{ width: timelineEdgeSpacerWidth }} />
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 px-1 text-[12px] leading-none">
          <div
            className="flex min-w-0 items-center gap-2"
            style={{ color: "var(--incident-text-muted)" }}
          >
            <span className="truncate tabular-nums">
              {firstIncidentYear} – {lastIncidentYear} · {totalIncidentCount}건
            </span>
          </div>
          <span
            className="font-number tabular-nums"
            style={{ color: "var(--incident-text-muted)" }}
          >
            {activeIncidentIndex + 1} / {totalIncidentCount}
          </span>
        </div>

        <IncidentDetailPanel activeIncident={activeIncident} />

        <ul>
          <li className="px-1 text-xs leading-4 text-muted-foreground">
            *사건 설명은 AI가 요약했으므로 관련 기사 원문을 함께 확인하세요.
          </li>
          <li className="px-1 text-xs leading-4 text-muted-foreground">
            * 피해액은 원화 환산 추정치
          </li>
        </ul>
      </div>
    </PageLayout>
  );
}
