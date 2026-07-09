"use client";

import { KIcon } from "kku-ui";

interface UpdownIconTypes {
  isUp: boolean;
  size?: number;
  className?: string;
}

export default function UpdownIcon({ isUp, size = 8, className }: UpdownIconTypes) {
  return (
    <KIcon
      className={`updown-icon${className ? ` ${className}` : ""}`}
      icon={isUp ? "triangleUp" : "triangleDown"}
      color={isUp ? "#22d48e" : "#F6465D"}
      size={size}
      suppressHydrationWarning
    />
  );
}
