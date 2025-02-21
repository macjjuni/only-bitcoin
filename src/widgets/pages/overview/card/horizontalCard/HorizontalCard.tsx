import { memo, ReactNode, useMemo } from "react";
import { ComponentBaseTypes } from "@/shared/types/base.interface";
import "./HorizontalCard.scss";


interface HorizontalCardInterface extends ComponentBaseTypes {
  children: ReactNode;
  rows?: number;
}

const HorizontalCard = ({children, className, rows = 3}: HorizontalCardInterface) => {


  // region [Hooks]

  const rootClass = useMemo(() => {

    const classArr = ['horizontal-card'];

    if (className) { classArr.push(className); }

    if (rows) { classArr.push(`horizontal-card--row-${rows}`)}

    return classArr.join(' ');
  }, [className, rows]);

  // endregion


  return (
    <div className={rootClass}>
      {children}
    </div>
  );
};

export default memo(HorizontalCard);
