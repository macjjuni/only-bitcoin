"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { calcPercentage, getNextHalvingData, useBlockStore } from "@/entities/block";
import { formatDate } from "@/shared/lib/date";
import { useMounted } from "@/shared/lib/hooks";
import CosmicBackdrop from "./CosmicBackdrop";
import CountdownUnit from "./CountdownUnit";
import HalvingGauge from "./HalvingGauge";

/** 비트코인 평균 블록 생성 간격 */
const BLOCK_INTERVAL_MS = 10 * 60 * 1000;

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

interface HalvingCountdownProps {
  /** SSR 로 미리 조회한 블록 높이. 소켓이 붙기 전까지의 표시값이다. */
  initialBlockHeight: number;
}

const HalvingCountdown = ({ initialBlockHeight }: HalvingCountdownProps) => {
  // region [Hooks]
  const isMount = useMounted();
  const storeBlockHeight = useBlockStore((state) => state.blockData[0]?.height ?? 0);
  const currentBlockHeight = storeBlockHeight || initialBlockHeight;

  const [targetTime, setTargetTime] = useState(0);
  const [remainMs, setRemainMs] = useState(0);

  const nextHalvingData = useMemo(
    () => getNextHalvingData(currentBlockHeight),
    [currentBlockHeight],
  );
  const restBlockCount = useMemo(
    () => Math.max(nextHalvingData.blockHeight - currentBlockHeight, 0),
    [nextHalvingData, currentBlockHeight],
  );
  const halvingPercent = useMemo(
    () => calcPercentage(nextHalvingData.blockHeight, currentBlockHeight),
    [nextHalvingData, currentBlockHeight],
  );

  const countdown = useMemo(
    () => ({
      days: Math.floor(remainMs / DAY),
      hours: Math.floor((remainMs % DAY) / HOUR),
      minutes: Math.floor((remainMs % HOUR) / MINUTE),
      seconds: Math.floor((remainMs % MINUTE) / SECOND),
    }),
    [remainMs],
  );

  const expectedDate = useMemo(() => {
    if (!isMount || !targetTime) return "YYYY.MM.DD";
    return formatDate(targetTime, "YYYY.MM.DD");
  }, [isMount, targetTime]);
  // endregion

  // region [Life Cycles]
  /**
   * 남은 블록 수가 바뀔 때만 목표 시각을 다시 고정한다.
   * 매 초 `Date.now()` 기준으로 다시 더하면 목표가 계속 밀려 카운트다운이 멈춘 것처럼 보인다.
   */
  useEffect(() => {
    if (!restBlockCount) return;
    // eslint-disable-next-line react-hooks/purity
    setTargetTime(Date.now() + restBlockCount * BLOCK_INTERVAL_MS);
  }, [restBlockCount]);

  useEffect(() => {
    if (!targetTime) return;

    const tick = () => {
      setRemainMs(Math.max(targetTime - Date.now(), 0));
    };

    tick();
    const timerId = setInterval(tick, SECOND);
    return () => clearInterval(timerId);
  }, [targetTime]);
  // endregion

  return (
    <section className="relative z-[2] flex flex-auto flex-col">
      <CosmicBackdrop />

      <div className="flex flex-auto flex-col items-center justify-center gap-7">
        <header className="flex flex-col items-center gap-1.5 text-center">
          <span className="glass-card rounded-full px-4 py-1.5 text-[12px] font-medium tracking-wide text-white/70">
            다음 반감기까지
          </span>
          <h1 className="font-number text-2xl font-bold text-white drop-shadow-[0_0_18px_rgba(247,147,26,0.5)]">
            {nextHalvingData.blockHeight.toLocaleString()} 블록
          </h1>
        </header>

        <div className="flex w-full items-stretch gap-1.5">
          <CountdownUnit value={countdown.days} label="일" minLength={3} />
          <CountdownUnit value={countdown.hours} label="시간" />
          <CountdownUnit value={countdown.minutes} label="분" />
          <CountdownUnit value={countdown.seconds} label="초" />
        </div>

        <div className="glass-card w-full rounded-2xl p-4">
          <div className="flex items-center justify-between text-md">
            <span className="font-bold text-white/80">반감기 진행률</span>
            <span className="font-number font-bold text-bitcoin">{halvingPercent}%</span>
          </div>

          <HalvingGauge percent={halvingPercent} />

          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col gap-0.5">
              <dt
                className="text-sm
               text-white/50"
              >
                현재 블록
              </dt>
              <dd className="font-number text-md font-bold text-white">
                {currentBlockHeight.toLocaleString()}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-sm text-white/50">남은 블록</dt>
              <dd className="font-number text-md font-bold text-bitcoin">
                {restBlockCount.toLocaleString()}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-sm text-white/50">예상 반감기</dt>
              <dd className="font-number text-md font-bold text-white">{expectedDate}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
};

const MemoizedHalvingCountdown = memo(HalvingCountdown);
MemoizedHalvingCountdown.displayName = "HalvingCountdown";

export default MemoizedHalvingCountdown;
