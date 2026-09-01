import { type ReactNode, useCallback } from "react";
import type { IncidentYearAnchor } from "../model/incidents";

interface YearJumpChipProps {
  yearAnchor: IncidentYearAnchor;
  isActive: boolean;
  onSelectYear: (incidentIndex: number) => void;
  onRegisterYearJumpChip: (year: string, yearJumpChipElement: HTMLButtonElement | null) => void;
}

export function YearJumpChip({
  yearAnchor,
  isActive,
  onSelectYear,
  onRegisterYearJumpChip,
}: YearJumpChipProps): ReactNode {
  //#region [Hooks]
  const onAssignYearJumpChipReference = useCallback(
    (yearJumpChipElement: HTMLButtonElement | null): void => {
      onRegisterYearJumpChip(yearAnchor.year, yearJumpChipElement);
    },
    [onRegisterYearJumpChip, yearAnchor.year],
  );
  //#endregion

  //#region [Events]
  const onClickYearJumpChip = (): void => {
    onSelectYear(yearAnchor.incidentIndex);
  };
  //#endregion

  return (
    <button
      ref={onAssignYearJumpChipReference}
      type="button"
      onClick={onClickYearJumpChip}
      aria-current={isActive ? "true" : undefined}
      className="inline-flex shrink-0 items-center rounded-full px-3 py-2 font-number
        text-sm leading-none tabular-nums transition-colors duration-[160ms] ease-[ease]
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
