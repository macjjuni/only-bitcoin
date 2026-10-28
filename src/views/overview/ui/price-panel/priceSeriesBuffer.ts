/**
 * 미니차트가 화면에 들고 있을 가격 포인트 상한.
 *
 * 컴포넌트 폭이 140px 이므로 1포인트당 약 2.2px 다. 이보다 촘촘하게 들고 있어도
 * 서브픽셀로 뭉개져 보이지 않으므로, 원본 시계열(5분봉 288개)을 이 길이로 줄여 보관한다.
 */
export const defaultPricePointCapacity = 60;

export interface PriceSeriesBuffer {
  /** 보관 가능한 최대 포인트 수. 생성 이후 변하지 않는다. */
  readonly capacity: number;
  /** 링 버퍼 저장소. 길이가 `capacity` 로 고정된 상태를 유지한다. */
  readonly prices: Float64Array;
  /** 다음 쓰기가 들어갈 슬롯. `capacity` 에 도달하면 0으로 되돌아간다. */
  writeIndex: number;
  /** 실제로 채워진 포인트 수. `capacity` 를 넘지 않는다. */
  length: number;
}

/**
 * 고정 길이 버퍼를 만든다.
 *
 * 저장소를 한 번만 할당하고 이후에는 덮어쓰기만 하므로, 포인트가 계속 들어와도
 * 배열 재할당이나 GC 압력이 생기지 않는다.
 */
export function createPriceSeriesBuffer(
  capacity: number = defaultPricePointCapacity,
): PriceSeriesBuffer {
  const normalizedCapacity = Math.max(1, Math.floor(capacity));

  return {
    capacity: normalizedCapacity,
    prices: new Float64Array(normalizedCapacity),
    writeIndex: 0,
    length: 0,
  };
}

/**
 * 최신 가격 한 건을 밀어 넣는다. 버퍼가 가득 차 있으면 가장 오래된 포인트를 덮어쓴다.
 *
 * 실시간 시세를 이어 붙일 때 쓰는 입구이며, 호출 비용이 상수라 초당 호출에도 안전하다.
 */
export function pushPrice(buffer: PriceSeriesBuffer, price: number): void {
  if (!Number.isFinite(price)) {
    return;
  }

  buffer.prices[buffer.writeIndex] = price;
  buffer.writeIndex = (buffer.writeIndex + 1) % buffer.capacity;

  if (buffer.length < buffer.capacity) {
    buffer.length += 1;
  }
}

/**
 * 가장 최근 포인트를 현재 시세로 덮어쓴다. 버퍼가 비어 있으면 첫 포인트로 기록한다.
 *
 * 실시간 시세는 추가가 아니라 교체여야 한다. 포인트 하나가 덮는 시간 구간(24시간 ÷ 용량)이
 * 틱 간격보다 훨씬 길어서, 틱마다 밀어 넣으면 보관 중인 시간 범위가 몇십 초로 줄어든다.
 * 구간이 넘어가는 시점은 원본 시계열을 다시 받을 때 자연히 맞춰진다.
 */
export function replaceLatestPrice(buffer: PriceSeriesBuffer, price: number): void {
  if (!Number.isFinite(price)) {
    return;
  }

  if (buffer.length === 0) {
    pushPrice(buffer, price);
    return;
  }

  const latestIndex = (buffer.writeIndex - 1 + buffer.capacity) % buffer.capacity;
  buffer.prices[latestIndex] = price;
}

/**
 * 전체 시계열을 `capacity` 개 구간으로 나눠 각 구간의 마지막 값만 남기고 버퍼를 다시 채운다.
 *
 * 구간 평균이 아니라 마지막 값을 쓰는 이유는 두 가지다. 가격 시계열에서는 구간 종가가
 * 그 시점의 실제 체결가라 의미가 분명하고, 마지막 포인트가 원본의 최신 가격과 항상 일치해
 * 끝점에 찍는 라이브 점이 현재가와 어긋나지 않는다.
 *
 * 중간 배열을 만들지 않고 한 번만 훑는다.
 */
export function resetPriceSeriesBuffer(buffer: PriceSeriesBuffer, series: readonly number[]): void {
  buffer.writeIndex = 0;
  buffer.length = 0;

  const sourceLength = series.length;

  if (sourceLength === 0) {
    return;
  }

  const pointCount = Math.min(buffer.capacity, sourceLength);

  for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
    const sourceIndex = Math.floor(((pointIndex + 1) * sourceLength) / pointCount) - 1;
    pushPrice(buffer, series[sourceIndex]);
  }
}

/**
 * 버퍼 내용을 과거→최신 순서로 `destination` 에 복사하고 유효 길이를 돌려준다.
 *
 * 렌더마다 배열을 새로 만들지 않도록 호출자가 재사용할 저장소를 넘기는 형태로 둔다.
 */
export function readPricesInOrder(buffer: PriceSeriesBuffer, destination: Float64Array): number {
  const { capacity, prices, writeIndex, length } = buffer;
  const readStartIndex = length < capacity ? 0 : writeIndex;
  const copyLength = Math.min(length, destination.length);

  for (let pointIndex = 0; pointIndex < copyLength; pointIndex += 1) {
    destination[pointIndex] = prices[(readStartIndex + pointIndex) % capacity];
  }

  return copyLength;
}
