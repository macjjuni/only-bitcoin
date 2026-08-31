import { type KeyboardEvent, type ReactNode, useCallback } from "react";
import {
  calculateTimelineNodeDiameter,
  formatIncidentFullDate,
  formatIncidentShortDate,
  type IncidentEvent,
} from "../model/incidents";
import { incidentTypeColorTokens, timelineItemWidthInPixels } from "./incidentConstants";

interface TimelineIncidentNodeProps {
  incident: IncidentEvent;
  incidentIndex: number;
  isActive: boolean;
  gapInPixels: number;
  onRegisterTimelineNode: (
    incidentIndex: number,
    timelineNodeElement: HTMLButtonElement | null,
  ) => void;
  onSelectIncident: (incidentIndex: number) => void;
  onNavigateIncident: (incidentIndex: number, direction: -1 | 1) => void;
}

export function TimelineIncidentNode({
  incident,
  incidentIndex,
  isActive,
  gapInPixels,
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
  const timelineNodeDiameterInPixels = calculateTimelineNodeDiameter(incident.amount);
  const incidentTypeColorToken = incidentTypeColorTokens[incident.type];
  //#endregion

  return (
    <div
      className="flex h-full shrink-0 snap-center flex-col items-center justify-center gap-2"
      style={{
        width: timelineItemWidthInPixels,
        marginLeft: gapInPixels > 0 ? gapInPixels : undefined,
      }}
    >
      <span
        className="h-3 font-number text-[11px] font-medium leading-none tabular-nums"
        style={{
          color: isActive ? "var(--incident-text)" : "var(--incident-text-muted)",
          transition: "color 160ms ease",
        }}
      >
        {formatIncidentShortDate(incident.date)}
      </span>

      <span className="relative flex h-7 w-full items-center justify-center overflow-visible">
        <span
          aria-hidden
          className="absolute right-0 top-1/2 h-px"
          style={{
            backgroundColor: "var(--incident-axis)",
            left: gapInPixels > 0 ? -gapInPixels : incidentIndex === 0 ? "50%" : 0,
          }}
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
              opacity: isActive ? 1 : 0.2,
              transform: isActive ? "scale(1.5)" : "scale(1)",
              transition: "transform 160ms ease, opacity 160ms ease",
            }}
          />
        </button>
      </span>

      <span
        className="w-full truncate text-center text-[11px] font-medium leading-none"
        style={{
          color: isActive ? "var(--incident-text)" : "var(--incident-text-muted)",
          transition: "color 160ms ease",
        }}
      >
        {incident.name}
      </span>
    </div>
  );
}
