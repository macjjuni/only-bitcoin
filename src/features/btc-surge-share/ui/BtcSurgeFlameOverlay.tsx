"use client";

import { memo, useMemo } from "react";

/**
 * 급등 톤 카드 하단에서 타오르는 불꽃 레이어.
 *
 * 카드는 `html-to-image` 로 캡처되는데, 복제본의 애니메이션은 0% 프레임부터 다시 시작한다.
 * 그래서 0% 상태만으로도 불이 보이도록 바닥 불빛은 애니메이션 없는 정적 레이어로 깔고,
 * 흔들림은 그 위의 불꽃 혀에만 준다. ( 공유 이미지에도 불꽃이 그대로 남는다 )
 */
export interface BtcSurgeFlameOverlayProps {
  /** 불꽃 색상 RGB 채널 값. ( `101,31,255` 형태 ) */
  rgbChannel: string;
  /** 레이어 높이. 카드 비율이 달라 호출 측이 정한다. */
  heightClassName: string;
}

interface FlameTongue {
  id: string;
  leftPercent: number;
  widthPercent: number;
  heightPercent: number;
  /** 흔들림 모양. 세 가지 키프레임을 섞어 같은 궤적이 반복되지 않게 한다. */
  animationClassName: string;
  /** 기둥별 재생 시간. 서로 배수가 되지 않는 값이라 주기가 겹쳐 맞춰지지 않는다. */
  durationMs: number;
  delayMs: number;
  /** 번짐 정도. 값이 클수록 뒤쪽에 있는 불처럼 보인다. */
  blurInPixels: number;
  /** 밑동이 좌 · 우로 기울어진 모양까지 다르게 둔다. */
  borderRadius: string;
}

/**
 * 불꽃 기둥.
 *
 * 간격 · 폭 · 높이 · 주기를 모두 어긋나게 두고 일부는 서로 겹쳐 세운다.
 * 균등 배치하면 다섯 개가 한 박자로 흔들려 불이 아니라 그래프 막대처럼 보인다.
 */
const FLAME_TONGUE_LIST: readonly FlameTongue[] = [
  {
    id: "t1",
    leftPercent: -1,
    widthPercent: 17,
    heightPercent: 32,
    animationClassName: "animate-surge-flame",
    durationMs: 2310,
    delayMs: 0,
    blurInPixels: 9,
    borderRadius: "54% 46% 44% 40% / 74% 70% 28% 26%",
  },
  {
    id: "t2",
    leftPercent: 8,
    widthPercent: 11,
    heightPercent: 52,
    animationClassName: "animate-surge-flame-lean",
    durationMs: 1670,
    delayMs: 540,
    blurInPixels: 6,
    borderRadius: "48% 52% 40% 46% / 80% 76% 24% 22%",
  },
  {
    id: "t3",
    leftPercent: 20,
    widthPercent: 20,
    heightPercent: 23,
    animationClassName: "animate-surge-flame-sway",
    durationMs: 2770,
    delayMs: 230,
    blurInPixels: 10,
    borderRadius: "46% 54% 48% 42% / 66% 72% 32% 30%",
  },
  {
    id: "t4",
    leftPercent: 29,
    widthPercent: 13,
    heightPercent: 64,
    animationClassName: "animate-surge-flame",
    durationMs: 1930,
    delayMs: 880,
    blurInPixels: 6,
    borderRadius: "52% 48% 42% 44% / 82% 78% 22% 20%",
  },
  {
    id: "t5",
    leftPercent: 42,
    widthPercent: 17,
    heightPercent: 36,
    animationClassName: "animate-surge-flame-sway",
    durationMs: 2510,
    delayMs: 120,
    blurInPixels: 8,
    borderRadius: "44% 56% 46% 44% / 70% 74% 30% 26%",
  },
  {
    id: "t6",
    leftPercent: 51,
    widthPercent: 12,
    heightPercent: 70,
    animationClassName: "animate-surge-flame-lean",
    durationMs: 1790,
    delayMs: 1310,
    blurInPixels: 6,
    borderRadius: "50% 50% 38% 46% / 84% 80% 20% 18%",
  },
  {
    id: "t7",
    leftPercent: 64,
    widthPercent: 19,
    heightPercent: 28,
    animationClassName: "animate-surge-flame-sway",
    durationMs: 2190,
    delayMs: 420,
    blurInPixels: 10,
    borderRadius: "56% 44% 46% 42% / 68% 70% 32% 28%",
  },
  {
    id: "t8",
    leftPercent: 74,
    widthPercent: 12,
    heightPercent: 55,
    animationClassName: "animate-surge-flame",
    durationMs: 1610,
    delayMs: 1020,
    blurInPixels: 6,
    borderRadius: "48% 52% 44% 40% / 78% 82% 22% 24%",
  },
  {
    id: "t9",
    leftPercent: 86,
    widthPercent: 15,
    heightPercent: 34,
    animationClassName: "animate-surge-flame-lean",
    durationMs: 2630,
    delayMs: 660,
    blurInPixels: 9,
    borderRadius: "52% 48% 42% 48% / 72% 68% 30% 26%",
  },
];

interface Ember {
  id: string;
  leftPercent: number;
  /** 떠오르기 시작하는 높이. 기둥 높이가 제각각이라 출발점도 맞추지 않는다. */
  bottomPercent: number;
  sizeInPixels: number;
  delayMs: number;
  durationMs: number;
}

/** 불꽃에서 떨어져 올라가는 불티. 높이가 큰 기둥 쪽에 더 몰려 있다. */
const EMBER_LIST: readonly Ember[] = [
  { id: "e1", leftPercent: 11, bottomPercent: 22, sizeInPixels: 3, delayMs: 0, durationMs: 2870 },
  { id: "e2", leftPercent: 31, bottomPercent: 38, sizeInPixels: 4, delayMs: 930, durationMs: 3410 },
  {
    id: "e3",
    leftPercent: 44,
    bottomPercent: 14,
    sizeInPixels: 2,
    delayMs: 1640,
    durationMs: 2590,
  },
  { id: "e4", leftPercent: 54, bottomPercent: 44, sizeInPixels: 4, delayMs: 610, durationMs: 3830 },
  {
    id: "e5",
    leftPercent: 69,
    bottomPercent: 11,
    sizeInPixels: 3,
    delayMs: 2130,
    durationMs: 3070,
  },
  {
    id: "e6",
    leftPercent: 78,
    bottomPercent: 33,
    sizeInPixels: 3,
    delayMs: 1290,
    durationMs: 2730,
  },
  { id: "e7", leftPercent: 90, bottomPercent: 19, sizeInPixels: 2, delayMs: 480, durationMs: 3290 },
];

function BtcSurgeFlameOverlay({ rgbChannel, heightClassName }: BtcSurgeFlameOverlayProps) {
  // region [Templates]
  const FlameTongueListTemplate = useMemo(
    () =>
      FLAME_TONGUE_LIST.map((tongue) => (
        <span
          key={tongue.id}
          className={`absolute -bottom-[8%] mix-blend-screen will-change-transform motion-reduce:animate-none ${tongue.animationClassName}`}
          style={{
            left: `${tongue.leftPercent}%`,
            width: `${tongue.widthPercent}%`,
            height: `${tongue.heightPercent}%`,
            animationDuration: `${tongue.durationMs}ms`,
            animationDelay: `${tongue.delayMs}ms`,
            filter: `blur(${tongue.blurInPixels}px)`,
            transformOrigin: "50% 100%",
            borderRadius: tongue.borderRadius,
            background: `radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.72) 0%, rgba(${rgbChannel},0.9) 30%, rgba(${rgbChannel},0.38) 62%, rgba(${rgbChannel},0) 100%)`,
          }}
        />
      )),
    [rgbChannel],
  );

  const EmberListTemplate = useMemo(
    () =>
      EMBER_LIST.map(({ id, leftPercent, bottomPercent, sizeInPixels, delayMs, durationMs }) => (
        <span
          key={id}
          className="absolute rounded-full animate-surge-ember motion-reduce:hidden"
          style={{
            left: `${leftPercent}%`,
            bottom: `${bottomPercent}%`,
            width: sizeInPixels,
            height: sizeInPixels,
            animationDelay: `${delayMs}ms`,
            animationDuration: `${durationMs}ms`,
            backgroundColor: `rgba(${rgbChannel},0.95)`,
            boxShadow: `0 0 8px rgba(${rgbChannel},0.9), 0 0 2px rgba(255,255,255,0.9)`,
          }}
        />
      )),
    [rgbChannel],
  );
  // endregion

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-0 pointer-events-none overflow-hidden ${heightClassName}`}
      aria-hidden="true"
    >
      {/* 바닥 불빛 ( 정지 프레임에서도 불이 보이도록 고정 ) */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 76% 100% at 50% 100%, rgba(${rgbChannel},0.42) 0%, rgba(${rgbChannel},0.16) 42%, rgba(${rgbChannel},0) 76%)`,
        }}
      />

      {FlameTongueListTemplate}
      {EmberListTemplate}

      {/* 불꽃 밑동의 흰 불심 */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/5 mix-blend-screen"
        style={{
          background: `linear-gradient(to top, rgba(255,255,255,0.16) 0%, rgba(${rgbChannel},0.09) 45%, rgba(${rgbChannel},0) 100%)`,
        }}
      />
    </div>
  );
}

const MemoizedBtcSurgeFlameOverlay = memo(BtcSurgeFlameOverlay);
MemoizedBtcSurgeFlameOverlay.displayName = "BtcSurgeFlameOverlay";

export default MemoizedBtcSurgeFlameOverlay;
