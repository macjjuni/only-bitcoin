import type { ShareCardTimeframe } from "./shareCardTimeframe";

/**
 * 공유 카드 색상 톤.
 *
 * 상승 · 하락은 초록 · 빨강이지만, 하루 만에 두 자릿수로 뛴 날이 평범한 상승과 같은 색이면
 * 카드가 전하려는 "급등" 이 드러나지 않으므로 보라색 톤으로 따로 뺀다.
 */
export type ShareCardTone = "up" | "down" | "surge";

/** 이 변동률 이상이면 급등 톤. ( 1D 에서만 판정한다 ) */
export const SURGE_TONE_THRESHOLD_PERCENT = 10;

/** 급등 판정을 적용하는 타임프레임. 장기 구간의 10% 는 급등이 아니다. */
const SURGE_TONE_TIMEFRAME: ShareCardTimeframe = "1D";

export interface ShareCardToneStyle {
  /** 카드 전역 강조 색상 ( 변동률 · 차트 · 워터마크 ) */
  color: string;
  /** 글로우 · 그라데이션에 끼워 쓰는 RGB 채널 값 */
  rgbChannel: string;
  /** 상승 · 하락 삼각형 아이콘 색상 */
  iconColor: string;
  /** 카드 테두리와 베이스 배경 */
  frameClassName: string;
  /** LIVE 뱃지 */
  badgeClassName: string;
  /** 타임프레임 선택 목록의 선택 항목 */
  selectedTimeframeClassName: string;
  /** 카드 배경 그라데이션 아래쪽 색 */
  backgroundBaseColor: string;
  /** 카드 배경 그라데이션 위쪽 색 */
  backgroundTopColor: string;
}

export const SHARE_CARD_TONE_STYLE: Record<ShareCardTone, ShareCardToneStyle> = {
  up: {
    color: "#00E676",
    rgbChannel: "0,230,118",
    iconColor: "#22d48e",
    frameClassName: "border-emerald-500/30 bg-[#0a0d14]",
    badgeClassName: "text-[#00E676] bg-emerald-500/20",
    selectedTimeframeClassName: "bg-[#00E676] text-black shadow-[0_0_12px_rgba(0,230,118,0.4)]",
    backgroundBaseColor: "rgba(10,13,20,0.98)",
    backgroundTopColor: "rgba(16,24,38,0.95)",
  },
  down: {
    color: "#FF5252",
    rgbChannel: "255,82,82",
    iconColor: "#F6465D",
    frameClassName: "border-rose-500/30 bg-[#0f0a0d]",
    badgeClassName: "text-[#FF5252] bg-rose-500/20",
    selectedTimeframeClassName: "bg-[#FF5252] text-white shadow-[0_0_12px_rgba(255,82,82,0.4)]",
    backgroundBaseColor: "rgba(15,10,13,0.98)",
    backgroundTopColor: "rgba(38,16,20,0.95)",
  },
  surge: {
    color: "#651FFF",
    rgbChannel: "101,31,255",
    iconColor: "#651FFF",
    frameClassName: "border-violet-700/50 bg-[#0a0616]",
    badgeClassName: "text-[#8F5CFF] bg-violet-700/30",
    selectedTimeframeClassName: "bg-[#651FFF] text-white shadow-[0_0_12px_rgba(101,31,255,0.5)]",
    backgroundBaseColor: "rgba(10,6,22,0.98)",
    backgroundTopColor: "rgba(24,12,58,0.95)",
  },
};

/**
 * 타임프레임과 변동률로 카드 톤을 결정한다.
 *
 * @param timeframe 카드가 그리는 구간
 * @param changePercent 해당 구간의 변동률 ( % )
 */
export function resolveShareCardTone(
  timeframe: ShareCardTimeframe,
  changePercent: number,
): ShareCardTone {
  /**
   * `useShareCardMetrics` 의 `isUp` 과 같은 식을 쓴다.
   *
   * 부호 · 삼각형 방향은 `changePercent >= 0` 으로 가르는데, 여기서 `< 0` 으로 가르면
   * 변동률이 `NaN`( 24시간 변동률 파싱 실패 ) 일 때 양쪽 판정이 어긋나 하락 화살표에
   * 상승 초록이 붙는다.
   */
  const isUpChangePercent = changePercent >= 0;

  if (!isUpChangePercent) {
    return "down";
  }

  if (timeframe === SURGE_TONE_TIMEFRAME && changePercent >= SURGE_TONE_THRESHOLD_PERCENT) {
    return "surge";
  }

  return "up";
}
