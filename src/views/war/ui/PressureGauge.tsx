"use client";

import type { ReactNode } from "react";
import { toBuySharePercent } from "../lib/formatWarValues";

interface PressureGaugeProps {
  /** -1(매도 우세) ~ 1(매수 우세) 통합 압력. */
  pressure: number;
}

/**
 * 통합 압력 게이지.
 *
 * 캔버스의 전선과 같은 은유를 쓴다. 두 진영이 막대를 나눠 가지고 그 경계가 전선이다.
 * 한 방향으로만 채우면 "얼마나 찼는가"로 읽혀 대결 구도가 사라지므로, 매수를 왼쪽
 * 매도를 오른쪽에 두고 경계가 밀리게 그린다. 좌우 배치는 캔버스 진영과 같다.
 *
 * 발광과 반짝임은 우세한 쪽에만 준다. 양쪽 다 빛나면 어느 쪽이 밀고 있는지가 묻힌다.
 */
export function PressureGauge({ pressure }: PressureGaugeProps): ReactNode {
  //#region [Privates]
  const buySharePercent = toBuySharePercent(pressure);
  const isBuyDominant = pressure >= 0;

  /** 우세한 쪽만 발광시킨다. 열세 쪽은 채움만 남겨 대비를 만든다. */
  const buyFillClass = isBuyDominant
    ? "bg-gradient-to-r from-up/55 to-up shadow-[0_0_14px_rgb(var(--up-rgb)/0.6)]"
    : "bg-up/45";

  const sellFillClass = isBuyDominant
    ? "bg-down/45"
    : "bg-gradient-to-l from-down/55 to-down shadow-[0_0_14px_rgb(var(--down-rgb)/0.6)]";
  //#endregion

  return (
    <div
      className="relative h-4 w-full overflow-hidden rounded-full bg-neutral-300/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] dark:bg-neutral-800"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(buySharePercent)}
      aria-label="매수 우세 비율"
    >
      <div
        className={`absolute inset-y-0 left-0 transition-[width] duration-500 ease-out ${buyFillClass}`}
        style={{ width: `${buySharePercent}%` }}
      >
        {/* 우세한 쪽 채움을 훑고 지나가는 하이라이트. */}
        {isBuyDominant && (
          <span
            className="absolute inset-y-0 left-0 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent motion-reduce:hidden"
            aria-hidden="true"
          />
        )}
      </div>

      <div
        className={`absolute inset-y-0 right-0 transition-[width] duration-500 ease-out ${sellFillClass}`}
        style={{ width: `${100 - buySharePercent}%` }}
      >
        {!isBuyDominant && (
          <span
            className="absolute inset-y-0 right-0 w-1/2 animate-shimmer bg-gradient-to-l from-transparent via-white/40 to-transparent motion-reduce:hidden"
            aria-hidden="true"
          />
        )}
      </div>

      {/*
        균형점. 전선이 여기서 얼마나 밀렸는지를 재는 기준선이라 채움 위에 겹친다.
        채움 색이 테마마다 밝기가 달라, 밝은 바탕에서는 어둡게 어두운 바탕에서는 밝게 둔다.
      */}
      <span
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-neutral-900/20 dark:bg-neutral-100/35"
        aria-hidden="true"
      />

      {/*
        전선. 두 진영이 맞닿은 자리를 밝게 세워 시선을 모은다.
        맥동 애니메이션이 `transform` 을 잡아 쓰므로 자리잡기용 `-translate-x-1/2` 와
        겹치지 않게 바깥 요소가 위치를, 안쪽 요소가 애니메이션을 맡는다.
      */}
      <span
        className="absolute inset-y-0 w-[3px] -translate-x-1/2 transition-[left] duration-500 ease-out"
        style={{ left: `${buySharePercent}%` }}
        aria-hidden="true"
      >
        <span className="block h-full w-full animate-gauge-pulse rounded-full bg-neutral-800/85 blur-[1px] motion-reduce:animate-none dark:bg-white/95" />
      </span>
    </div>
  );
}
