import { HEAT_DOMAIN_PERCENT } from "../lib/heatLevel";

/**
 * 히트맵 색 눈금.
 *
 * 셀 색은 5단계로 끊지만 눈금은 연속 띠로 그림. 계단으로 그리면 "몇 단계인지" 를
 * 세게 만드는데, 여기서 알아야 할 건 단계 수가 아니라 **어느 쪽이 상승이고
 * 양 끝이 몇 퍼센트인지** 임.
 */
const HEAT_GRADIENT = [
  "linear-gradient(to right,",
  "rgb(var(--down-rgb)) 0%,",
  "rgb(var(--down-rgb) / 0.15) 44%,",
  "rgb(var(--up-rgb) / 0.15) 56%,",
  "rgb(var(--up-rgb)) 100%)",
].join(" ");

const HeatmapLegend = () => (
  <div className="flex items-center gap-2 text-[10px] tabular-nums text-muted-foreground">
    <span>-{HEAT_DOMAIN_PERCENT}%</span>
    <div className="h-2.5 flex-1 rounded-sm" style={{ background: HEAT_GRADIENT }} />
    <span>+{HEAT_DOMAIN_PERCENT}%</span>
  </div>
);

export default HeatmapLegend;
