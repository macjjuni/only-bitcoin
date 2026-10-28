import { describe, expect, it } from "vitest";
import {
  createPriceSeriesBuffer,
  type PriceSeriesBuffer,
  pushPrice,
  readPricesInOrder,
  replaceLatestPrice,
  resetPriceSeriesBuffer,
} from "./priceSeriesBuffer";

function readAll(buffer: PriceSeriesBuffer): number[] {
  const destination = new Float64Array(buffer.capacity);
  const length = readPricesInOrder(buffer, destination);

  return Array.from(destination.subarray(0, length));
}

describe("priceSeriesBuffer", () => {
  it("용량을 넘기면 가장 오래된 포인트를 버린다", () => {
    const buffer = createPriceSeriesBuffer(3);

    for (const price of [1, 2, 3, 4, 5]) {
      pushPrice(buffer, price);
    }

    expect(buffer.length).toBe(3);
    expect(buffer.prices).toHaveLength(3);
    expect(readAll(buffer)).toEqual([3, 4, 5]);
  });

  it("용량보다 긴 시계열은 다운샘플하되 최신 가격은 항상 끝에 남는다", () => {
    const buffer = createPriceSeriesBuffer(4);
    const series = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    resetPriceSeriesBuffer(buffer, series);

    const points = readAll(buffer);
    expect(points).toHaveLength(4);
    expect(points.at(-1)).toBe(series.at(-1));
  });

  it("용량보다 짧은 시계열은 원본 그대로 담는다", () => {
    const buffer = createPriceSeriesBuffer(10);

    resetPriceSeriesBuffer(buffer, [7, 8, 9]);

    expect(readAll(buffer)).toEqual([7, 8, 9]);
  });

  it("다시 채우면 이전 내용이 남지 않는다", () => {
    const buffer = createPriceSeriesBuffer(3);

    resetPriceSeriesBuffer(buffer, [1, 2, 3]);
    resetPriceSeriesBuffer(buffer, [9]);

    expect(readAll(buffer)).toEqual([9]);
  });

  it("실시간 시세는 끝 포인트만 덮어쓰고 보관 범위를 밀어내지 않는다", () => {
    const buffer = createPriceSeriesBuffer(3);

    resetPriceSeriesBuffer(buffer, [1, 2, 3]);
    replaceLatestPrice(buffer, 99);
    replaceLatestPrice(buffer, 100);

    expect(readAll(buffer)).toEqual([1, 2, 100]);
  });

  it("빈 버퍼에 들어온 실시간 시세는 첫 포인트가 된다", () => {
    const buffer = createPriceSeriesBuffer(3);

    replaceLatestPrice(buffer, 42);

    expect(readAll(buffer)).toEqual([42]);
  });

  it("버퍼가 한 바퀴 돈 뒤에도 끝 포인트를 정확히 덮어쓴다", () => {
    const buffer = createPriceSeriesBuffer(3);

    for (const price of [1, 2, 3, 4, 5]) {
      pushPrice(buffer, price);
    }
    replaceLatestPrice(buffer, 50);

    expect(readAll(buffer)).toEqual([3, 4, 50]);
  });

  it("실시간 시세가 유한하지 않으면 끝 포인트를 건드리지 않는다", () => {
    const buffer = createPriceSeriesBuffer(3);

    resetPriceSeriesBuffer(buffer, [1, 2, 3]);
    replaceLatestPrice(buffer, Number.NaN);

    expect(readAll(buffer)).toEqual([1, 2, 3]);
  });

  it("빈 시계열은 버퍼를 비운다", () => {
    const buffer = createPriceSeriesBuffer(3);

    resetPriceSeriesBuffer(buffer, [1, 2, 3]);
    resetPriceSeriesBuffer(buffer, []);

    expect(buffer.length).toBe(0);
    expect(readAll(buffer)).toEqual([]);
  });

  it("유한하지 않은 값은 무시한다", () => {
    const buffer = createPriceSeriesBuffer(3);

    pushPrice(buffer, 1);
    pushPrice(buffer, Number.NaN);
    pushPrice(buffer, Number.POSITIVE_INFINITY);

    expect(readAll(buffer)).toEqual([1]);
  });
});
