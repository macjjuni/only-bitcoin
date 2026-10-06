"use client";

import { KIcon } from "kku-ui";

interface UpdownIconTypes {
  isUp: boolean;
  /** 기본 상승 · 하락 색상을 덮어쓸 색. ( 급등 톤처럼 카드 색상에 맞춰야 할 때 ) */
  color?: string;
  size?: number;
  className?: string;
}

export default function UpdownIcon({ isUp, color, size = 8, className }: UpdownIconTypes) {
  return (
    <KIcon
      className={`updown-icon${className ? ` ${className}` : ""}`}
      icon={isUp ? "triangleUp" : "triangleDown"}
      color={color ?? (isUp ? "#22d48e" : "#F6465D")}
      size={size}
      suppressHydrationWarning
    />
  );
}
