import { memo, ReactNode, useMemo } from "react";
import "./HorizontalCard.scss";
import { BaseProps } from "@/shared/types/base.interface";


interface HorizontalCardInterface extends BaseProps {
  children: ReactNode
}

const HorizontalCard = ({children, className}: HorizontalCardInterface) => {



  // region [Hooks]

  const rootClass = useMemo(() => {

    const classArr = ['horizontal-card'];

    if (className) { classArr.push(className); }

    return classArr.join(' ');
  }, [className]);

  // endregion



  return (
    <div className={rootClass}>
      {children}
    </div>
  );
};

export default memo(HorizontalCard);
