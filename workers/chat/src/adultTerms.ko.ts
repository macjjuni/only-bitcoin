export interface AdultTermRule {
  term: string;
  mode: "exact-token" | "bounded-phrase" | "substring";
  allowWords?: readonly string[];
  allowSeparators?: boolean;
}

/** 노골적인 선정성 표현만 관리하며 일반 욕설·정치·투자 의견은 포함하지 않는다. */
export const ADULT_TERM_RULES: readonly AdultTermRule[] = [
  { term: "야동", mode: "substring", allowSeparators: true },
  { term: "포르노", mode: "substring", allowSeparators: true },
  { term: "성인방송", mode: "bounded-phrase", allowSeparators: true },
  { term: "음란물", mode: "substring", allowSeparators: true },
  { term: "섹스", mode: "exact-token", allowSeparators: true },
] as const;
