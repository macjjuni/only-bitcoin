import type { ReactNode } from "react";
import type { ComponentBaseTypes } from "@/shared/lib/types";

type HighlightVariant = "bitcoin" | "up" | "down";
type HighlightType = "text" | "marker";

interface HighlightTextTypes extends ComponentBaseTypes {
  children: ReactNode;
  /** 강조 색상. bitcoin(주황) · up(상승) · down(하락) */
  variant?: HighlightVariant;
  /** text: 글자색만 강조 · marker: 형광펜 배경 강조 */
  type?: HighlightType;
  /** 굵게 표시 여부 */
  bold?: boolean;
}

const TEXT_VARIANT_CLASS: Record<HighlightVariant, string> = {
  bitcoin: "text-bitcoin decoration-bitcoin/60",
  up: "text-up decoration-up/60",
  down: "text-down decoration-down/60",
};

const MARKER_VARIANT_CLASS: Record<HighlightVariant, string> = {
  bitcoin: "bg-bitcoin/30 text-bitcoin",
  up: "bg-up/30 text-up",
  down: "bg-down/30 text-down",
};

/**
 * 문장 안의 특정 텍스트를 강조하는 공통 컴포넌트.
 *
 * @example
 * <HighlightText>21,000,000 BTC</HighlightText>
 * <HighlightText type="marker" variant="up">반감기</HighlightText>
 */
const HighlightText = (props: HighlightTextTypes) => {
  // region [Privates]
  const { id, className = "", children, variant = "bitcoin", type = "text", bold = true } = props;

  const variantClass =
    type === "marker" ? MARKER_VARIANT_CLASS[variant] : TEXT_VARIANT_CLASS[variant];
  const markerClass =
    type === "marker"
      ? "rounded px-1 py-0.5"
      : "underline decoration-2 underline-offset-2";
  const weightClass = bold ? "font-bold" : "";

  const rootClass = ["bg-transparent", variantClass, markerClass, weightClass, className]
    .filter(Boolean)
    .join(" ");
  // endregion

  // region [Render]
  return (
    <mark id={id} className={rootClass}>
      {children}
    </mark>
  );
  // endregion
};

export default HighlightText;
