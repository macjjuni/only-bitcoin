import { memo, ReactNode } from "react";
import "./ChipItem.scss";

interface IChip {
  label: string | ReactNode;
  value: string;
  onClick?: () => void;
}

function ChipItem({ label, value, onClick }: IChip) {
  return (
    <button type="button" className="only-btc__chip" onClick={onClick}>
      <div className="only-btc__chip-container">
        <span className="only-btc__chip-container__label">{label}</span>
        <span className="only-btc__chip-container__value">{value}</span>
      </div>
    </button>
  );
}

export default memo(ChipItem);
