"use client";

import { type CSSProperties, memo } from "react";
import { QRCode } from "react-qrcode-logo";

const SHARE_QR_SIZE = 48;
const SHARE_QR_PADDING = 6;
const SHARE_QR_RENDER_SCALE = 3;

export interface ShareCardQrProps {
  id: string;
  value: string;
  size?: number;
  padding?: number;
  renderScale?: number;
  className?: string;
  style?: CSSProperties;
  ecLevel?: "L" | "M" | "Q" | "H";
  qrStyle?: "squares" | "dots" | "fluid";
  eyeRadius?: number;
}

function ShareCardQr({
  id,
  value,
  size = SHARE_QR_SIZE,
  padding = SHARE_QR_PADDING,
  renderScale = SHARE_QR_RENDER_SCALE,
  className,
  style,
  ecLevel = "M",
  qrStyle = "dots",
  eyeRadius = 8,
}: ShareCardQrProps) {
  if (!value) {
    return null;
  }

  const totalSize = size + padding * 2;

  return (
    <div
      className={["ml-auto flex-none rounded-lg bg-white", className].filter(Boolean).join(" ")}
      style={{
        width: totalSize,
        height: totalSize,
        padding,
        ...style,
      }}
    >
      <span data-capture-ignore="" className="block">
        <QRCode
          id={id}
          value={value}
          size={size * renderScale}
          quietZone={0}
          ecLevel={ecLevel}
          qrStyle={qrStyle}
          eyeRadius={eyeRadius}
          style={{ display: "block", width: size, height: size }}
        />
      </span>
    </div>
  );
}

const MemoizedShareCardQr = memo(ShareCardQr);
MemoizedShareCardQr.displayName = "ShareCardQr";

export default MemoizedShareCardQr;
