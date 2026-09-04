"use client";

import { type CSSProperties, memo } from "react";
import { QRCode } from "react-qrcode-logo";

const SHARE_QR_SIZE = 48;
const SHARE_QR_PADDING = 6;
const SHARE_QR_RENDER_SCALE = 3;

const EMOJI_LOGO_BOX = 100; // 이모지 SVG 의 좌표계 크기(실제 크기는 QRCode 가 logoWidth 로 다시 정한다)
const EMOJI_LOGO_FONT_SIZE = 76;
const EMOJI_FONT_STACK = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

/**
 * 이모지를 QR 중앙 로고로 쓰기 위해 SVG data URI 로 감싼다.
 *
 * QRCode 는 로고를 canvas 에 `drawImage` 로 그리므로 DOM 텍스트를 얹을 수 없다.
 * 캔버스를 그대로 캡처해 공유 이미지에 합성하는 경로에서도 이모지가 남아야 해서
 * DOM 오버레이 대신 이미지로 만들어 넘긴다.
 */
function buildEmojiLogoSrc(emoji: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${EMOJI_LOGO_BOX}" height="${EMOJI_LOGO_BOX}" viewBox="0 0 ${EMOJI_LOGO_BOX} ${EMOJI_LOGO_BOX}">` +
    `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="${EMOJI_LOGO_FONT_SIZE}" font-family="${EMOJI_FONT_STACK}">${emoji}</text>` +
    `</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

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
  logoEmoji?: string;
  logoPadding?: number;
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
  logoEmoji,
  logoPadding = 0,
}: ShareCardQrProps) {
  if (!value) {
    return null;
  }

  const totalSize = size + padding * 2;
  const logoImage = logoEmoji ? buildEmojiLogoSrc(logoEmoji) : undefined;

  return (
    <div
      className={["flex-none rounded-lg bg-white", className].filter(Boolean).join(" ")}
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
          logoImage={logoImage}
          // 캔버스를 renderScale 배로 그린 뒤 CSS 로 줄이므로, 화면 기준 px 로 받은 값도 같은 배율로 키운다.
          logoPadding={logoPadding * renderScale}
          logoPaddingStyle="circle"
          removeQrCodeBehindLogo
          style={{ display: "block", width: size, height: size }}
        />
      </span>
    </div>
  );
}

const MemoizedShareCardQr = memo(ShareCardQr);
MemoizedShareCardQr.displayName = "ShareCardQr";

export default MemoizedShareCardQr;
