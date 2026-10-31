import { describe, expect, it } from "vitest";
import {
  type ChartRect,
  downsamplePrices,
  resolveChartPoints,
  resolveChartScale,
  resolveTickY,
} from "@/views/space/lib/billboardChart";

const RECT: ChartRect = { left: 60, top: 466, width: 1375, height: 304 };

describe("resolveChartScale", () => {
  it("축 범위가 실제 가격 범위를 모두 감싼다", () => {
    const prices = [96_240, 97_880, 99_410, 100_120];
    const scale = resolveChartScale(prices);

    expect(scale.min).toBeLessThanOrEqual(Math.min(...prices));
    expect(scale.max).toBeGreaterThanOrEqual(Math.max(...prices));
  });

  it("눈금은 1·2·5 계열 간격으로 균등하다", () => {
    const scale = resolveChartScale([96_240, 100_120]);
    const gaps = scale.ticks.slice(1).map((tick, index) => tick - scale.ticks[index]);

    for (const gap of gaps) {
      expect(gap).toBeCloseTo(gaps[0], 6);
    }
  });

  it("눈금 수는 목표치 언저리로 나온다", () => {
    // 데이터를 꼭 감싸려면 한 칸이 더 필요할 수 있다. 개수를 고정하려 간격을
    // 키우면 범위가 벌어져 선이 차트 아래쪽에 눌리므로 개수를 양보한다.
    for (const targetCount of [3, 5]) {
      const tickTotal = resolveChartScale([96_240, 100_120], targetCount).ticks.length;

      expect(tickTotal).toBeGreaterThanOrEqual(targetCount);
      expect(tickTotal).toBeLessThanOrEqual(targetCount + 1);
    }
  });

  it("축 범위가 실제 변동폭에 바짝 붙는다", () => {
    const prices = [96_500, 97_200, 99_800, 100_100];
    const scale = resolveChartScale(prices);
    const dataSpan = Math.max(...prices) - Math.min(...prices);
    const step = scale.ticks[1] - scale.ticks[0];

    // 위아래로 눈금 한 칸 이상 남기지 않는다.
    expect(scale.max - scale.min).toBeLessThanOrEqual(dataSpan + step * 2);
  });

  it("모든 가격이 같아도 0 으로 나누지 않는다", () => {
    const scale = resolveChartScale([100_000, 100_000, 100_000]);

    expect(scale.max).toBeGreaterThan(scale.min);
    expect(Number.isFinite(scale.min)).toBe(true);
  });

  it("빈 배열은 안전한 기본 범위를 준다", () => {
    expect(resolveChartScale([])).toEqual({ min: 0, max: 1, ticks: [0, 1] });
  });

  it("NaN 이 섞여도 유효한 값만 쓴다", () => {
    const scale = resolveChartScale([96_000, Number.NaN, 100_000]);

    expect(Number.isFinite(scale.min)).toBe(true);
    expect(Number.isFinite(scale.max)).toBe(true);
  });
});

describe("resolveChartPoints", () => {
  it("첫 점은 왼쪽 끝, 마지막 점은 오른쪽 끝에 놓인다", () => {
    const scale = resolveChartScale([96_000, 100_000]);
    const points = resolveChartPoints([96_000, 98_000, 100_000], scale, RECT);

    expect(points[0].x).toBeCloseTo(RECT.left, 6);
    expect(points[points.length - 1].x).toBeCloseTo(RECT.left + RECT.width, 6);
  });

  it("모든 점이 차트 영역 안에 들어간다", () => {
    const prices = [96_240, 97_880, 99_410, 100_120, 98_050];
    const scale = resolveChartScale(prices);

    for (const point of resolveChartPoints(prices, scale, RECT)) {
      expect(point.x).toBeGreaterThanOrEqual(RECT.left);
      expect(point.x).toBeLessThanOrEqual(RECT.left + RECT.width);
      expect(point.y).toBeGreaterThanOrEqual(RECT.top);
      expect(point.y).toBeLessThanOrEqual(RECT.top + RECT.height);
    }
  });

  it("값이 클수록 캔버스 위쪽(작은 y)에 놓인다", () => {
    const scale = resolveChartScale([96_000, 100_000]);
    const [low, high] = resolveChartPoints([96_000, 100_000], scale, RECT);

    expect(high.y).toBeLessThan(low.y);
  });

  it("점이 하나면 가로 중앙에 둔다", () => {
    const scale = resolveChartScale([100_000]);
    const [point] = resolveChartPoints([100_000], scale, RECT);

    expect(point.x).toBeCloseTo(RECT.left + RECT.width / 2, 6);
  });

  it("빈 배열은 빈 좌표를 준다", () => {
    expect(resolveChartPoints([], resolveChartScale([]), RECT)).toEqual([]);
  });
});

describe("resolveTickY", () => {
  it("최저 눈금은 바닥, 최고 눈금은 천장에 붙는다", () => {
    const scale = resolveChartScale([96_000, 100_000]);

    expect(resolveTickY(scale.min, scale, RECT)).toBeCloseTo(RECT.top + RECT.height, 6);
    expect(resolveTickY(scale.max, scale, RECT)).toBeCloseTo(RECT.top, 6);
  });
});

describe("downsamplePrices", () => {
  it("목표 개수로 줄인다", () => {
    const prices = Array.from({ length: 288 }, (_, index) => index);

    expect(downsamplePrices(prices, 180)).toHaveLength(180);
  });

  it("마지막 점(현재가)을 반드시 남긴다", () => {
    const prices = Array.from({ length: 288 }, (_, index) => index);
    const sampled = downsamplePrices(prices, 180);

    expect(sampled[sampled.length - 1]).toBe(287);
    expect(sampled[0]).toBe(0);
  });

  it("목표보다 짧으면 그대로 돌려준다", () => {
    expect(downsamplePrices([1, 2, 3], 180)).toEqual([1, 2, 3]);
  });

  it("목표가 0 이하면 빈 배열이다", () => {
    expect(downsamplePrices([1, 2, 3], 0)).toEqual([]);
  });

  it("단조 증가 순서를 유지한다", () => {
    const prices = Array.from({ length: 288 }, (_, index) => index);
    const sampled = downsamplePrices(prices, 50);

    for (let index = 1; index < sampled.length; index += 1) {
      expect(sampled[index]).toBeGreaterThan(sampled[index - 1]);
    }
  });
});
