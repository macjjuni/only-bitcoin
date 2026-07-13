"use client";

import { KSkeleton } from "kku-ui";
import { memo, useMemo } from "react";
import CountUp from "react-countup";
import { useMounted } from "@/shared/lib/hooks";
import type { ComponentBaseTypes } from "@/shared/lib/types";
import useSettingStore from "@/shared/stores/settingStore";

interface CountTextTypes extends ComponentBaseTypes {
  value: number;
  duration?: number;
  decimals?: number;
  separator?: string;
}

const CountText = (props: CountTextTypes) => {
  // region [Hooks]
  const isMount = useMounted();
  const isCountUp = useSettingStore((state) => state.setting.isCountUp);
  const { className, value, duration = 0.3, decimals = 0, separator = "," } = props;

  const rootClass = useMemo(() => (className ? ` ${className}` : ""), [className]);

  const startValue = useMemo(() => {
    if (!isCountUp) {
      return value;
    }
    // eslint-disable-next-line react-hooks/purity
    const isPositive = Math.random() < 0.5; // 50% 확률로 + 또는 -
    const difference = value * 0.005; // 0.5% 차이 계산

    return isPositive ? value + difference : value - difference;
  }, [value, isCountUp]);

  /**
   * 마운트 전(서버 렌더링 및 hydration 첫 렌더)에 출력할 정적 문자열.
   * CountUp 은 클라이언트에서만 동작하므로, 이 값이 곧 크롤러가 읽는 숫자가 된다.
   */
  const staticValue = useMemo(
    () =>
      value
        .toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
        .replaceAll(",", separator),
    [value, decimals, separator],
  );
  // endregion

  // region [Render]
  if (!isMount) {
    // 값이 아직 없을 때만 스켈레톤. 값이 있으면 SSR HTML 에 실제 숫자를 남긴다.
    if (!value) {
      return (
        <KSkeleton className={`inline-flex text-inherit text-transparent w-full ${rootClass}`}>
          Loading
        </KSkeleton>
      );
    }

    return <span className={`font-number ${rootClass}`}>{staticValue}</span>;
  }

  return (
    <CountUp
      className={`font-number ${rootClass}`}
      start={startValue}
      end={value}
      duration={duration}
      decimals={decimals}
      separator={separator}
    />
  );
  // endregion
};

export default memo(CountText);
