import { memo, useMemo } from "react";
import CountUp from "react-countup";
import { ComponentBaseTypes } from "@/shared/types/base.interface";
import useStore from "@/shared/stores/store";


interface CountTextTypes extends ComponentBaseTypes {
  value: number;
  duration?: number;
  decimals?: number;
  separator?: string;
}

const CountText = (props: CountTextTypes) => {


  // region [Hooks]

  const isCountUp = useStore(state => state.setting.isCountUp);
  const { className, value, duration = 0.3, decimals= 0, separator = "," } = props;

  const startValue = useMemo(() => {

    if (!isCountUp) {
        return value;
    }
    const isPositive = Math.random() < 0.5; // 50% 확률로 + 또는 -
    const difference = value * 0.03; // 3% 차이 계산

    return isPositive ? value + difference : value - difference;
  }, [value, isCountUp]);

  // endregion


  return (<CountUp className={className} start={startValue} end={value} duration={duration}
                   decimals={decimals} separator={separator} />);
};

export default memo(CountText);
