"use client";

import { memo, useEffect, useMemo, useState } from "react";
import {
  calcPercentage,
  getHalvingRewardTransition,
  getNextHalvingData,
  useBlockStore,
} from "@/entities/block";
import { formatDate } from "@/shared/lib/date";
import { useMounted } from "@/shared/lib/hooks";
import CountdownUnit from "./CountdownUnit";
import HalvingConfetti from "./HalvingConfetti";
import HalvingGauge from "./HalvingGauge";

/** 비트코인 평균 블록 생성 간격 */
const BLOCK_INTERVAL_MS = 10 * 60 * 1000;

/** 반감기 주기 */
const HALVING_INTERVAL = 210000;

/**
 * 반감기 도달 후 100% 표시를 유지할 블록 수.
 * 144 블록 ≈ 1일(비트코인 관례상 하루치 블록) 동안 도달 상태를 보여준 뒤 다음 주기로 넘어간다.
 */
const HALVING_GRACE_BLOCK_COUNT = 144;

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
  const [isConfettiActive, setIsConfettiActive] = useState(false);

  const nextHalvingData = useMemo(
    () => getNextHalvingData(currentBlockHeight),
    [currentBlockHeight],
  );

  /**
   * 반감기 도달 직후 유예 구간 여부.
   * 반감기 블록이 채굴되면 `current % 210000` 이 0 이 되어 진행률이 100% 에서 즉시 0% 로 떨어짐.
   * 도달 직후 일정 블록 동안은 방금 지난 반감기를 계속 목표로 삼아 100% 를 유지.
   */
  const isHalvingGrace = useMemo(() => {
    if (!currentBlockHeight) return false;
    return currentBlockHeight % HALVING_INTERVAL < HALVING_GRACE_BLOCK_COUNT;
  }, [currentBlockHeight]);

  /** 유예 구간에는 방금 지난 반감기를, 평소에는 다음 반감기를 표시 대상으로 삼는다. */
  const displayHalvingData = useMemo(() => {
    if (!isHalvingGrace) return nextHalvingData;

    const passedHeight = Math.floor(currentBlockHeight / HALVING_INTERVAL) * HALVING_INTERVAL;
    return getNextHalvingData(passedHeight - 1);
  }, [isHalvingGrace, nextHalvingData, currentBlockHeight]);

  const restBlockCount = useMemo(
    () => Math.max(displayHalvingData.blockHeight - currentBlockHeight, 0),
    [displayHalvingData, currentBlockHeight],
  );
  const halvingPercent = useMemo(() => {
    if (isHalvingGrace) return 100;
    return calcPercentage(displayHalvingData.blockHeight, currentBlockHeight);
  }, [isHalvingGrace, displayHalvingData, currentBlockHeight]);

  /**
   * 몇 번째 반감기인지.
   * 210,000 블록마다 한 번씩 오므로 반감기 블록 높이를 주기로 나눈 값이 그대로 회차가 됨.
   * (210,000 → 1회차, 840,000 → 4회차)
   */
  const halvingOrdinal = useMemo(
    () => Math.floor(displayHalvingData.blockHeight / HALVING_INTERVAL),
    [displayHalvingData],
  );

  /** 유예 구간에만 노출할 블록 보상 변화. 평소에는 노출하지 않음 */
  const rewardTransition = useMemo(() => {
    if (!isHalvingGrace) return null;
    return getHalvingRewardTransition(displayHalvingData.blockHeight);
  }, [isHalvingGrace, displayHalvingData]);

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
    // 유예 구간에는 이미 지난 시점이라 예측이 아닌 확정 날짜를 그대로 보여줌.
    if (isHalvingGrace) return displayHalvingData.date;
    if (!isMount || !targetTime) return "YYYY.MM.DD";
    return formatDate(targetTime, "YYYY.MM.DD");
  }, [isHalvingGrace, displayHalvingData, isMount, targetTime]);
  // endregion

  // region [Events]
  const onCompleteConfetti = () => {
    setIsConfettiActive(false);
  };
  // endregion

  // region [Life Cycles]
  /**
   * 유예 구간(진행률 100%)에 진입하면 컨페티를 재생.
   * `isHalvingGrace` 는 불리언이라 유예 중 새 블록이 들어와도 값이 그대로여서 effect 가 다시 돌지 않음.
   * 덕분에 체류 중 도달·유예 중 페이지 진입 두 경우 모두 한 번씩만 터짐.
   */
  useEffect(() => {
    if (!isHalvingGrace) return;

    setIsConfettiActive(true);
  }, [isHalvingGrace]);

  /**
   * 남은 블록 수가 바뀔 때만 목표 시각을 다시 고정.
   * 매 초 `Date.now()` 기준으로 다시 더하면 목표가 계속 밀려 카운트다운이 멈춘 것처럼 보임.
   */
  useEffect(() => {
    // 유예 구간(남은 블록 0)에는 직전 목표 시각이 남아 카운트다운이 멈춘 것처럼 보이므로 0 으로 고정.
    if (!restBlockCount) {
      setTargetTime(0);
      setRemainMs(0);
      return;
    }

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
      <div className="flex flex-auto flex-col items-center justify-center gap-7">
        <header className="flex flex-col items-center gap-1.5 text-center">
          <span
            className={`glass-card rounded-full px-4 py-1.5 text-[12px] font-medium tracking-wide ${
              isHalvingGrace
                ? "text-bitcoin ring-1 ring-bitcoin/40 shadow-[0_0_20px_rgba(247,147,26,0.35)]"
                : "text-white/70"
            }`}
          >
            {isHalvingGrace ? `🎉 ${halvingOrdinal}번째 반감기 도달` : "다음 반감기까지"}
          </span>
          <h1 className="font-number text-2xl font-bold text-white drop-shadow-[0_0_18px_rgba(247,147,26,0.5)]">
            {displayHalvingData.blockHeight.toLocaleString()} 블록
          </h1>

          {rewardTransition && (
            <p className="font-number mt-0.5 flex items-center gap-2 text-md">
              <span className="text-white/40 line-through">{rewardTransition.before} BTC</span>
              <span aria-hidden className="text-white/30">
                →
              </span>
              <span className="font-bold text-bitcoin drop-shadow-[0_0_12px_rgba(247,147,26,0.5)]">
                {rewardTransition.after} BTC
              </span>
            </p>
          )}
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

          <HalvingGauge percent={halvingPercent} isReached={isHalvingGrace} />

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

      <HalvingConfetti isActive={isConfettiActive} onComplete={onCompleteConfetti} />
    </section>
  );
};

const MemoizedHalvingCountdown = memo(HalvingCountdown);
MemoizedHalvingCountdown.displayName = "HalvingCountdown";

export default MemoizedHalvingCountdown;
