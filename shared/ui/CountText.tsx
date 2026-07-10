"use client";

import { KSkeleton } from "kku-ui";
import { memo, useMemo } from "react";
import CountUp from "react-countup";
import { useMounted } from "@/shared/hooks";
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
  // endregion

  // region [Render]
  if (!isMount) {
    return (
      <KSkeleton className={`inline-flex text-inherit text-transparent w-full ${rootClass}`}>
        Loading
      </KSkeleton>
    );
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
