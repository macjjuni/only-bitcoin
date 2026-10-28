import { useCallback, useMemo, useRef, useState } from "react";
import {
  createPriceSeriesBuffer,
  readPricesInOrder,
  replaceLatestPrice,
  resetPriceSeriesBuffer,
} from "./priceSeriesBuffer";

export interface PriceSeriesWindow {
  /** 과거→최신 순으로 정렬된 가격 포인트. 길이는 `pointLength` 까지만 유효하다. */
  pricePoints: Float64Array;
  /** `pricePoints` 에서 실제로 채워진 길이. */
  pointLength: number;
  /**
   * 윈도우 내용이 바뀔 때마다 증가하는 값.
   *
   * `pricePoints` 는 재사용되는 저장소라 내용이 바뀌어도 참조가 그대로다. 이 값을
   * 파생 `useMemo` 의 의존성에 함께 넣어야 갱신이 전달된다.
   */
  revision: number;
  /** 윈도우의 끝 포인트를 현재 시세로 갱신한다. */
  updateLatestPrice: (price: number) => void;
}

/**
 * 가격 시계열을 고정 길이 윈도우로만 들고 있는 훅.
 *
 * 원본 시계열이 바뀌면 윈도우를 다시 채우고, 그 사이에 들어오는 실시간 시세는
 * `updateLatestPrice` 로 끝 포인트에 반영한다. 보관량은 `capacity` 로 고정되며 넘치는
 * 과거 포인트는 버려진다.
 *
 * 저장소와 읽기 버퍼를 모두 ref 로 들고 있어 렌더마다 배열을 새로 만들지 않는다.
 */
export function usePriceSeriesBuffer(
  series: readonly number[],
  capacity: number,
): PriceSeriesWindow {
  //#region [Hooks]
  const bufferReference = useRef(createPriceSeriesBuffer(capacity));
  const orderedPricesReference = useRef(new Float64Array(bufferReference.current.capacity));
  const seededSeriesReference = useRef<readonly number[] | null>(null);
  const [liveRevision, setLiveRevision] = useState(0);

  /**
   * capacity 가 바뀌면 저장소 자체를 다시 잡는다.
   *
   * 렌더 중 교체지만 ref 를 같은 값으로 수렴시키는 1회성 갱신이라 부수효과가 남지 않는다.
   * 다시 채워야 하므로 시드 기록도 함께 비운다.
   */
  if (bufferReference.current.capacity !== Math.max(1, Math.floor(capacity))) {
    bufferReference.current = createPriceSeriesBuffer(capacity);
    orderedPricesReference.current = new Float64Array(bufferReference.current.capacity);
    seededSeriesReference.current = null;
  }

  const priceWindow = useMemo(() => {
    const buffer = bufferReference.current;

    /**
     * 원본 시계열이 교체된 경우에만 다시 채운다.
     *
     * 실시간 갱신으로 리비전만 올라간 렌더에서 재시드하면 끝 포인트가 되돌아간다.
     */
    if (seededSeriesReference.current !== series) {
      seededSeriesReference.current = series;
      resetPriceSeriesBuffer(buffer, series);
    }

    return {
      pricePoints: orderedPricesReference.current,
      pointLength: readPricesInOrder(buffer, orderedPricesReference.current),
      revision: liveRevision,
    };
  }, [series, capacity, liveRevision]);
  //#endregion

  //#region [Events]
  const updateLatestPrice = useCallback((price: number): void => {
    if (!Number.isFinite(price)) {
      return;
    }

    const buffer = bufferReference.current;
    const latestIndex = (buffer.writeIndex - 1 + buffer.capacity) % buffer.capacity;

    /** 같은 가격이 반복돼도 초당 리렌더가 나가지 않게 변화가 있을 때만 리비전을 올린다. */
    if (buffer.length > 0 && buffer.prices[latestIndex] === price) {
      return;
    }

    replaceLatestPrice(buffer, price);
    setLiveRevision((previousRevision) => previousRevision + 1);
  }, []);
  //#endregion

  return { ...priceWindow, updateLatestPrice };
}
