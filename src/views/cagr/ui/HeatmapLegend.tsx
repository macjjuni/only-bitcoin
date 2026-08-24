import { HEAT_DOMAIN_PERCENT } from "../lib/heatLevel";

/**
 * 히트맵 색 눈금.
 *
 * 셀 색은 5단계로 끊지만 눈금은 연속 띠로 그림. 계단으로 그리면 "몇 단계인지" 를
 * 세게 만드는데, 여기서 알아야 할 건 단계 수가 아니라 **어느 쪽이 상승이고
 * 양 끝이 몇 퍼센트인지** 임.
 */
/**
 * 가운데를 알파가 아니라 배경색과 섞어서 만듦. 셀과 같은 이유임 — 이 페이지는
 * 카드가 없어서 알파를 쓰면 `body.show-bg` 의 매트릭스 배경이 띠를 통해 비침.
 */
const HEAT_GRADIENT = [
  "linear-gradient(to right,",
  "var(--down-color) 0%,",
  "color-mix(in srgb, var(--down-color) 15%, hsl(var(--background))) 44%,",
  "color-mix(in srgb, var(--up-color) 15%, hsl(var(--background))) 56%,",
  "var(--up-color) 100%)",
].join(" ");

const HeatmapLegend = () => (
  // 표는 페이지 끝까지 빠져나가지만 눈금은 글줄과 같은 `px-5` 에 맞춤. 양 끝 캡이 글자라서 그럼.
  <div className="flex items-center gap-2 px-2 text-xs tabular-nums text-muted-foreground">
    <span>-{HEAT_DOMAIN_PERCENT}%</span>
    <div className="h-2.5 flex-1 rounded-sm" style={{ background: HEAT_GRADIENT }} />
    <span>+{HEAT_DOMAIN_PERCENT}%</span>
  </div>
);

export default HeatmapLegend;
