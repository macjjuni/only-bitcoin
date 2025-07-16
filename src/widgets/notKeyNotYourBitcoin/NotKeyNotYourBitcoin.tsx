import React, { useEffect, useState, memo } from 'react';
import './NotKeyNotYourBitcoin.scss';

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
      setFade(false); // 페이드 아웃

      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % shuffledList.length);
        setFade(true);
      }, FADE_OUT_TIME);
    }, ANIMATION_CHANGE_TIME);

    return () => clearInterval(interval);
  }, [shuffledList]);

  // endregion


  return (
    <div className={`not-your-keys-not-your-bitcoin__area ${fade ? 'fade-in' : 'fade-out'}`}>
      {shuffledList[currentIndex]}
    </div>
  );
};

export default memo(NotKeyNotYourBitcoin);
