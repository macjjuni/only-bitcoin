import { forwardRef, ReactNode, useMemo } from "react";
import { ComponentBaseTypes } from "@/shared/types/base.interface";
import "./HorizontalCard.scss";

interface HorizontalCardInterface extends ComponentBaseTypes {
  children: ReactNode;
  rows?: number;
}

const HorizontalCard = forwardRef<HTMLDivElement, HorizontalCardInterface>(
  ({ children, className, rows = 3 }, ref) => {

    const rootClass = useMemo(() => {
      const classArr = ['horizontal-card'];

      if (className) classArr.push(className);
      if (rows) classArr.push(`horizontal-card--row-${rows}`);

      return classArr.join(' ');
    }, [className, rows]);

    return (
      <div ref={ref} className={rootClass}>
        {children}
      </div>
    );
  }
);

HorizontalCard.displayName = 'HorizontalCard';
export default HorizontalCard;
