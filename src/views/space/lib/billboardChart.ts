/**
 * 전광판 24시간 차트의 스케일과 좌표 계산.
 *
 * 캔버스 없이 검증할 수 있도록 그리기와 분리한다.
 */

export interface ChartRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartScale {
  min: number;
  max: number;
  /** 축 눈금 값. 낮은 값부터 올라간다. */
  ticks: number[];
}

/** 눈금 간격으로 쓸 1·2·5 계열 값. */
const NICE_STEP_MULTIPLIERS = [1, 2, 2.5, 5, 10] as const;

// region [Privates]
/** 주어진 간격보다 크거나 같은 가장 가까운 1·2·5 계열 값. */
const resolveNiceStep = (rawStep: number): number => {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalizedStep = rawStep / magnitude;
  const multiplier = NICE_STEP_MULTIPLIERS.find((candidate) => candidate >= normalizedStep) ?? 10;

  return multiplier * magnitude;
};
// endregion

/**
 * 가격 배열에서 축 범위와 눈금을 만든다.
 *
 * 실제 최저·최고에 딱 맞추면 선이 차트 위아래 가장자리에 붙는다. 1·2·5 계열
 * 간격으로 바깥쪽으로 한 칸씩 넓혀 여백을 만들고 축 숫자도 읽기 좋게 한다.
 *
 * `tickCount` 는 목표치다. 간격을 깔끔하게 유지하면서 데이터를 꼭 감싸려면
 * 눈금이 하나 더 생길 수 있고, 개수를 고정하려 간격을 키우면 범위가 실제
 * 변동폭의 몇 배로 벌어진다. 범위를 좁게 두는 쪽을 택한다.
 */
export const resolveChartScale = (prices: readonly number[], tickCount = 3): ChartScale => {
  const validPrices = prices.filter((price) => Number.isFinite(price));

  if (validPrices.length === 0) {
    return { min: 0, max: 1, ticks: [0, 1] };
  }

  const lowestPrice = Math.min(...validPrices);
  const highestPrice = Math.max(...validPrices);
  const intervalCount = Math.max(tickCount - 1, 1);
  // 모든 값이 같아도 0 으로 나누지 않도록 최소 폭을 준다.
  const rawSpan = highestPrice - lowestPrice || Math.abs(highestPrice) * 0.01 || 1;

  const step = resolveNiceStep(rawSpan / intervalCount);
  // 데이터를 눈금 간격으로 양쪽에서 감싼다. 간격을 키워 눈금 수를 고정하면
  // 범위가 실제 변동폭의 몇 배로 벌어져 선이 차트 아래쪽에 눌린다.
  const min = Math.floor(lowestPrice / step) * step;
  const max = Math.ceil(highestPrice / step) * step;
  const tickTotal = Math.max(Math.round((max - min) / step), 1) + 1;
  const ticks = Array.from({ length: tickTotal }, (_, index) => {
    return Number((min + step * index).toFixed(6));
  });

  return { min: ticks[0], max: ticks[ticks.length - 1], ticks };
};

/**
 * 가격 배열을 차트 영역 안의 좌표로 바꾼다.
 *
 * 값이 하나뿐이면 가로 중앙에 둔다. 0 으로 나누는 것을 막기 위해서다.
 */
export const resolveChartPoints = (
  prices: readonly number[],
  scale: ChartScale,
  rect: ChartRect,
): ChartPoint[] => {
  if (prices.length === 0) {
    return [];
  }

  const valueSpan = scale.max - scale.min || 1;
  const stepX = prices.length > 1 ? rect.width / (prices.length - 1) : 0;

  return prices.map((price, index) => {
    const clampedPrice = Math.min(Math.max(price, scale.min), scale.max);
    const valueRatio = (clampedPrice - scale.min) / valueSpan;

    return {
      x: prices.length > 1 ? rect.left + stepX * index : rect.left + rect.width / 2,
      // 캔버스 y 는 아래로 증가하므로 비율을 뒤집는다.
      y: rect.top + rect.height * (1 - valueRatio),
    };
  });
};

/** 눈금 값의 세로 좌표. */
export const resolveTickY = (tickValue: number, scale: ChartScale, rect: ChartRect): number => {
  const valueSpan = scale.max - scale.min || 1;

  return rect.top + rect.height * (1 - (tickValue - scale.min) / valueSpan);
};

/**
 * 가격 배열을 목표 개수로 솎는다.
 *
 * 288개(5분봉 24시간)를 폭 1,320 px 에 그리면 한 점이 4.6 px 라 과하다.
 * 균등 간격으로 뽑되 마지막 점은 반드시 남겨 현재가가 잘리지 않게 한다.
 */
export const downsamplePrices = (prices: readonly number[], targetCount: number): number[] => {
  if (targetCount <= 0) {
    return [];
  }
  if (prices.length <= targetCount) {
    return [...prices];
  }

  const stride = (prices.length - 1) / (targetCount - 1);

  return Array.from({ length: targetCount }, (_, index) => {
    return prices[Math.round(index * stride)];
  });
};
