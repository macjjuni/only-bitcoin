import { SquareArrowOutUpRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  calculateIncidentAmountRatio,
  formatIncidentFullDate,
  type IncidentEvent,
  incidentTypeLabels,
} from "../model/incidents";
import { incidentTypeColorTokens } from "./incidentConstants";

interface IncidentDetailPanelProps {
  activeIncident: IncidentEvent;
}

export function IncidentDetailPanel({ activeIncident }: IncidentDetailPanelProps): ReactNode {
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
      className="flex min-h-64 flex-col gap-2.5 px-1"
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
        className="inline-flex w-fit items-center gap-1 rounded-full border px-3 py-1.5
          text-xs font-medium leading-none transition-opacity hover:opacity-75"
        style={{
          borderColor: activeIncidentTypeColorToken.badgeForeground,
          color: activeIncidentTypeColorToken.badgeForeground,
        }}
      >
        관련 기사
        <SquareArrowOutUpRight size={12} />
      </a>
    </section>
  );
}
