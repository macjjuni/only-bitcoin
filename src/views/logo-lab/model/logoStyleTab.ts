// region [Types]
export type LogoStyleTabId =
  | "glitch"
  | "crt"
  | "hash-stream"
  | "dot-matrix"
  | "guilloche"
  | "dither";

export interface LogoStyleTab {
  id: LogoStyleTabId;
  label: string;
}
// endregion

// region [Constants]
export const LOGO_STYLE_TABS: LogoStyleTab[] = [
  { id: "glitch", label: "글리치" },
  { id: "crt", label: "CRT 형광" },
  { id: "hash-stream", label: "해시 스트림" },
  { id: "dot-matrix", label: "도트 매트릭스" },
  { id: "guilloche", label: "지폐 기요셰" },
  { id: "dither", label: "1-bit 디더" },
];

export const DEFAULT_LOGO_STYLE_TAB_ID: LogoStyleTabId = "glitch";
// endregion
