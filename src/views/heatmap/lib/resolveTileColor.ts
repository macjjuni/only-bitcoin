import type { CoinMapTile } from "./buildCoinMapSummary";

export interface TileColor {
  fill: string;
  text: string;
}

type RgbColor = [number, number, number];

/** globals.css `--up-rgb` · `--down-rgb` 와 같은 값. SVG fill 에 CSS 변수를 못 써서 따로 둠. */
const UP_RGB: RgbColor = [34, 197, 94];
const DOWN_RGB: RgbColor = [239, 68, 68];

const THEME_COLOR = {
  light: { base: [244, 244, 245] as RgbColor, text: "#27272A", muted: "#71717A" },
  dark: { base: [39, 39, 42] as RgbColor, text: "#F4F4F5", muted: "#A1A1AA" },
};

/**
 * 등락률 절댓값 구간별 진하기. 월별 히트맵처럼 5단계로 끊음.
 * 연속값으로 칠하면 ±0.3% 와 ±0.6% 가 구분이 안 돼서 단계가 더 읽힘.
 */
const CHANGE_LEVELS: { maxAbsPercent: number; mixRatio: number }[] = [
  { maxAbsPercent: 0.5, mixRatio: 0.2 },
  { maxAbsPercent: 2, mixRatio: 0.4 },
  { maxAbsPercent: 5, mixRatio: 0.6 },
  { maxAbsPercent: 10, mixRatio: 0.8 },
  { maxAbsPercent: Number.POSITIVE_INFINITY, mixRatio: 1 },
];

/** 이 진하기부터 글자를 흰색으로 바꿈. */
const WHITE_TEXT_MIX_RATIO = 0.6;

// region [Privates]
const mixRgb = (from: RgbColor, to: RgbColor, ratio: number): string => {
  const mixed = from.map((channel, index) => Math.round(channel + (to[index] - channel) * ratio));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
};

const toHex = (color: RgbColor): string => mixRgb(color, color, 0);
// endregion

/** 범례 그라데이션용 양 끝 색. */
export const CHANGE_COLOR_STOPS = { up: toHex(UP_RGB), down: toHex(DOWN_RGB) };

/**
 * 칸 색 결정. 등락이 있는 코인은 초록/빨강 5단계,
 * 스테이블·기타·등락 정보 없음은 중립 회색.
 */
export const resolveTileColor = (
  tile: Pick<CoinMapTile, "kind" | "dailyChangePercent">,
  isDark: boolean,
): TileColor => {
  const theme = THEME_COLOR[isDark ? "dark" : "light"];
  const { dailyChangePercent } = tile;
  const isNeutral =
    tile.kind === "stablecoin" ||
    tile.kind === "others" ||
    dailyChangePercent === null ||
    dailyChangePercent === 0;

  if (isNeutral) {
    return { fill: toHex(theme.base), text: theme.muted };
  }

  const absPercent = Math.abs(dailyChangePercent);
  const { mixRatio } =
    CHANGE_LEVELS.find((level) => absPercent < level.maxAbsPercent) ??
    CHANGE_LEVELS[CHANGE_LEVELS.length - 1];
  const target = dailyChangePercent > 0 ? UP_RGB : DOWN_RGB;

  return {
    fill: mixRgb(theme.base, target, mixRatio),
    text: mixRatio >= WHITE_TEXT_MIX_RATIO ? "#FFFFFF" : theme.text,
  };
};

/** 범례에 쓰는 중립 칸 색. 스테이블·기타 칸과 같은 색. */
export const resolveNeutralTileFill = (isDark: boolean): string => {
  return toHex(THEME_COLOR[isDark ? "dark" : "light"].base);
};
