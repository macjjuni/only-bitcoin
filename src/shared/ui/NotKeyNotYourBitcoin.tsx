"use client";

import { memo, useEffect, useState } from "react";

const bitcoinWiseSayingList = [
  "Not your keys, not your Bitcoin.",
  "Stay humble and stack sats.",
  "HODL.",
  "Be your own bank.",
  "1BTC = 1BTC",
  "Don't Trust, Verify",
  "You need Bitcoin.",
] as const;

/** 글리치가 시작되고 문구를 바꿔 끼우는 시점. 찢김이 가장 심할 때 바꿔야 티가 안 남. */
const GLITCH_SWAP_TIME = 180 as const;
/** `globals.css` 의 `.glitch-text` 애니메이션 길이와 맞춤. */
const GLITCH_DURATION = 420 as const;
const ANIMATION_CHANGE_TIME = 10000 as const;
/** 문구 교체 사이 한가운데(5초)에도 글리치만 한 번 줌. */
const GLITCH_INTERVAL_TIME = ANIMATION_CHANGE_TIME / 2;

const shuffleArray = <T,>(array: readonly T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const NotKeyNotYourBitcoin = () => {
  // region [Hooks]
  const [shuffledList] = useState(() => shuffleArray(bitcoinWiseSayingList));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    let swapTimer: ReturnType<typeof setTimeout>;
    let glitchEndTimer: ReturnType<typeof setTimeout>;
    let glitchTickCount = 0;

    // 5초마다 글리치, 그중 짝수 번째(10초)에만 문구까지 바꿈.
    const interval = setInterval(() => {
      glitchTickCount += 1;
      const shouldSwapSaying = glitchTickCount % 2 === 0;

      setIsGlitching(true);

      if (shouldSwapSaying) {
        swapTimer = setTimeout(() => {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % shuffledList.length);
        }, GLITCH_SWAP_TIME);
      }

      glitchEndTimer = setTimeout(() => {
        setIsGlitching(false);
      }, GLITCH_DURATION);
    }, GLITCH_INTERVAL_TIME);

    return () => {
      clearInterval(interval);
      if (swapTimer) clearTimeout(swapTimer);
      if (glitchEndTimer) clearTimeout(glitchEndTimer);
    };
  }, [shuffledList]);
  // endregion

  const currentSaying = shuffledList[currentIndex];

  return (
    <div className="flex flex-col justify-end items-center flex-[1_1_auto] font-bold select-none text-[13px] text-current">
      <p suppressHydrationWarning className="flex items-center justify-center w-full h-5 mt-2">
        <span
          suppressHydrationWarning
          data-text={currentSaying}
          className={["glitch-text", isGlitching ? "is-glitching" : ""].join(" ")}
        >
          {currentSaying}
        </span>
      </p>
    </div>
  );
};

const MemoizedNotKeyNotYourBitcoin = memo(NotKeyNotYourBitcoin);
MemoizedNotKeyNotYourBitcoin.displayName = "NotKeyNotYourBitcoin";

export default MemoizedNotKeyNotYourBitcoin;
