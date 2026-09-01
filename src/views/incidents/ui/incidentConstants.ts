import type { IncidentType } from "../model/incidents";

export const scopedIncidentStyles = `
.incidents {
  --incident-text: #17181a;
  --incident-text-secondary: #5c6066;
  --incident-text-muted: #666d76;
  --incident-axis: #d8dce2;
  --incident-guide: #c8cdd5;
  --incident-track: #eceef2;
  --incident-border: #dcdfe5;
  --incident-chip-background: #eceef2;
  --incident-timeline-shadow: inset 0 2px 6px rgb(0 0 0 / 0.06), inset 0 -1px 3px rgb(0 0 0 / 0.03);

  --incident-hack-background: #fdeceb;
  --incident-hack-foreground: #8c2f26;
  --incident-hack-accent: #e4574c;

  --incident-halt-background: #efeafa;
  --incident-halt-foreground: #442a8a;
  --incident-halt-accent: #7c5cd6;

  --incident-bankruptcy-background: #eceef1;
  --incident-bankruptcy-foreground: #3c434c;
  --incident-bankruptcy-accent: #78828f;

  --incident-error-background: #fff3dc;
  --incident-error-foreground: #7a4a00;
  --incident-error-accent: #d88a12;
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
  --incident-timeline-shadow: inset 0 2px 6px rgb(0 0 0 / 0.25), inset 0 -1px 3px rgb(0 0 0 / 0.15);

  --incident-hack-background: rgb(228 87 76 / 0.16);
  --incident-hack-foreground: #ff9a90;
  --incident-hack-accent: #e4574c;

  --incident-halt-background: rgb(124 92 214 / 0.18);
  --incident-halt-foreground: #bfa8ff;
  --incident-halt-accent: #8b6ce0;

  --incident-bankruptcy-background: rgb(120 130 143 / 0.2);
  --incident-bankruptcy-foreground: #c2c9d2;
  --incident-bankruptcy-accent: #8b95a3;

  --incident-error-background: rgb(216 138 18 / 0.18);
  --incident-error-foreground: #ffc56d;
  --incident-error-accent: #e49a2d;
}
`;

export interface IncidentTypeColorToken {
  badgeBackground: string;
  badgeForeground: string;
  accent: string;
}

export const incidentTypeColorTokens: Record<IncidentType, IncidentTypeColorToken> = {
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
  bankruptcy: {
    badgeBackground: "var(--incident-bankruptcy-background)",
    badgeForeground: "var(--incident-bankruptcy-foreground)",
    accent: "var(--incident-bankruptcy-accent)",
  },
  error: {
    badgeBackground: "var(--incident-error-background)",
    badgeForeground: "var(--incident-error-foreground)",
    accent: "var(--incident-error-accent)",
  },
};

export const timelineItemWidthInPixels = 76;
export const timelinePixelsPerMonth = 6;
export const timelineEdgeSpacerWidth = `calc(50% - ${timelineItemWidthInPixels / 2}px)`;
export const centerDetectionThresholdRatio = 0.4;

export function createIncidentTimelineTabId(incidentId: string): string {
  return `incident-timeline-tab-${incidentId}`;
}

export function createIncidentDetailPanelId(incidentId: string): string {
  return `incident-detail-panel-${incidentId}`;
}

export function doesUserPreferReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
