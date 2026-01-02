'use client';

import { useEffect, useState, memo } from 'react';

const bitcoinWiseSayingList = [
  'Not your keys, not your ₿itcoin.',
  'Stay humble and stack sats.',
  'HODL.',
  'Be your own bank.',
  '1BTC = 1BTC',
  "Don't Trust, Verify",
  "You need ₿itcoin.",
] as const;

const FADE_OUT_TIME = 500 as const;
const ANIMATION_CHANGE_TIME = 10000 as const;

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
  const [fade, setFade] = useState(true);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false); // 페이드 아웃 시작

      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % shuffledList.length);
        setFade(true); // 페이드 인
      }, FADE_OUT_TIME);
    }, ANIMATION_CHANGE_TIME);

    return () => clearInterval(interval);
  }, [shuffledList]);
  // endregion

  return (
    <div
      className={[
        "flex flex-col justify-end items-center flex-[1_1_auto] font-bold select-none transition-opacity duration-[480ms] ease-in-out",
        "text-[13px] text-current",
        fade ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <p suppressHydrationWarning className="flex items-center justify-center w-full h-5 mt-2">{shuffledList[currentIndex]}</p>
    </div>
  );
};

const MemoizedNotKeyNotYourBitcoin = memo(NotKeyNotYourBitcoin)
MemoizedNotKeyNotYourBitcoin.displayName = 'NotKeyNotYourBitcoin';

export default MemoizedNotKeyNotYourBitcoin;