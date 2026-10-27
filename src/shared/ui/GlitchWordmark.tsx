"use client";

import { memo, useEffect, useRef, useState } from "react";
import { BITCOIN_COLOR } from "@/shared/config/color";
import {
  BAKE_PADDING_IN_CSS_PX,
  bakeWordmarkCanvas,
  createGlitchLogoController,
  type GlitchLogoController,
  type GlitchPlaybackMode,
  type GlitchPreset,
  WORDMARK_FONTS,
  type WordmarkFontId,
} from "@/shared/lib/wordmark-canvas";

interface GlitchWordmarkProps {
  preset: GlitchPreset;
  widthInCssPx: number;
  heightInCssPx: number;
  /** 재생 모드. 기본은 서비스에 나갈 동작과 같은 `production`. */
  playbackMode?: GlitchPlaybackMode;
  /** 워드마크를 조판할 폰트. 기본은 본문과 같은 Pretendard. */
  fontId?: WordmarkFontId;
  /** 워드마크 본체 색. 기본은 비트코인 브랜드 오렌지. */
  fillColor?: string;
  className?: string;
}

const GlitchWordmark = ({
  preset,
  widthInCssPx,
  heightInCssPx,
  playbackMode = "production",
  fontId = "pretendard",
  fillColor = BITCOIN_COLOR,
  className = "",
}: GlitchWordmarkProps) => {
  // region [Hooks]
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<GlitchLogoController | null>(null);
  const [isBakeFailed, setIsBakeFailed] = useState(false);
  // endregion

  // region [Events]
  /**
   * 호버·탭하면 즉시 반응하게 한다.
   *
   * `production` 모드에서는 대기를 건너뛰고 바로 튀고, `frozen` 모드에서는 글리치 프레임을
   * 새로 뽑는다. 같은 프리셋이 뽑아내는 변형의 폭을 보려면 이걸 몇 번 눌러 보는 게 가장 빠르다.
   */
  const onPointerEnterWordmark = () => {
    controllerRef.current?.triggerBurstNow();
  };

  /**
   * 터치 환경 대응.
   *
   * 터치에서는 `pointerenter` 가 브라우저마다 들쭉날쭉하게 발생하므로 `pointerdown` 으로
   * 한 번 더 받는다. 데스크톱에서 호버 후 클릭하면 두 번 호출되지만, `triggerBurstNow` 가
   * 대기 핸들을 먼저 정리하므로 버스트가 겹치지는 않는다.
   */
  const onPointerDownWordmark = () => {
    controllerRef.current?.triggerBurstNow();
  };
  // endregion

  // region [Life Cycles]
  /**
   * 워드마크를 굽고 재생 컨트롤러를 붙인다.
   *
   * 굽기는 비동기라 완료 전에 언마운트될 수 있다. `isEffectCancelled` 로 뒤늦게 도착한
   * 결과가 이미 정리된 캔버스를 건드리지 않게 막는다.
   *
   * `IntersectionObserver` 로 화면 밖에서는 루프를 멈춘다. 이 페이지처럼 캔버스가 여럿일 때
   * 전부가 각자 타이머를 돌리면 스크롤 중에 체감이 바로 나빠진다.
   */
  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null) {
      return;
    }

    let isEffectCancelled = false;
    let controller: GlitchLogoController | null = null;
    let intersectionObserver: IntersectionObserver | null = null;

    const attachController = async () => {
      try {
        const bakedWordmark = await bakeWordmarkCanvas({
          widthInCssPx,
          heightInCssPx,
          fillColor,
          fontId,
        });

        if (isEffectCancelled) {
          return;
        }

        controller = createGlitchLogoController({
          canvas,
          bakedWordmark,
          preset,
          playbackMode,
        });
        controllerRef.current = controller;

        intersectionObserver = new IntersectionObserver((entries) => {
          const isWordmarkVisible = entries.some((entry) => entry.isIntersecting);

          if (isWordmarkVisible) {
            controller?.start();
            return;
          }
          controller?.stop();
        });
        intersectionObserver.observe(canvas);
      } catch (bakeError) {
        /*
         * 조용히 폴백하면 안 된다. 폴백 텍스트도 같은 폰트·같은 색이라 겉보기에는 멀쩡해서,
         * 캔버스가 한 번도 안 그려졌다는 사실을 눈으로는 알 수가 없다.
         * ( 실제로 SVG 속성 따옴표 충돌로 전부 폴백된 적이 있다 )
         */
        console.error("[GlitchWordmark] 워드마크 굽기 실패", bakeError);

        if (!isEffectCancelled) {
          setIsBakeFailed(true);
        }
      }
    };

    attachController();

    return () => {
      isEffectCancelled = true;
      intersectionObserver?.disconnect();
      controller?.destroy();
      controllerRef.current = null;
    };
  }, [preset, widthInCssPx, heightInCssPx, playbackMode, fillColor, fontId]);
  // endregion

  // region [Templates]
  /**
   * 굽기가 실패하면( 폰트 요청 실패 등 ) 캔버스 대신 평범한 텍스트 워드마크를 보여 준다.
   * 로고 자리가 빈 채로 남는 것보다 낫다.
   */
  if (isBakeFailed) {
    return (
      <span
        className={`inline-flex items-center justify-center font-bold ${className}`}
        style={{
          width: widthInCssPx,
          height: heightInCssPx,
          fontFamily: `'${WORDMARK_FONTS[fontId].familyName}', sans-serif`,
          fontSize: heightInCssPx * 0.8,
          color: fillColor,
        }}
      >
        BITCOIN
      </span>
    );
  }
  // endregion

  return (
    <span
      className={`relative inline-block align-middle ${className}`}
      style={{ width: widthInCssPx, height: heightInCssPx }}
      onPointerEnter={onPointerEnterWordmark}
      onPointerDown={onPointerDownWordmark}
    >
      {/*
        캔버스는 레이아웃 박스보다 사방 BAKE_PADDING 만큼 크다. 채널 분리와 가로 띠가
        글자 바깥으로 삐져나가는데, 캔버스를 논리 크기로 맞추면 그 부분이 잘린다.
        음수 오프셋으로 띄워서 레이아웃 박스는 논리 크기를 유지한 채 글리치만 넘치게 한다.
      */}
      {/*
        `aria-hidden` 은 `<canvas>` 가 아니라 이 래퍼에 둔다. Biome 이 `<canvas>` 를
        인터랙티브 요소로 보기 때문에, 캔버스에 직접 달면 a11y 규칙과 계속 충돌한다.
      */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          left: -BAKE_PADDING_IN_CSS_PX,
          top: -BAKE_PADDING_IN_CSS_PX,
          width: widthInCssPx + BAKE_PADDING_IN_CSS_PX * 2,
          height: heightInCssPx + BAKE_PADDING_IN_CSS_PX * 2,
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </span>
      {/* 캔버스는 스크린 리더가 읽지 못하므로 워드마크 텍스트를 따로 노출한다. */}
      <span className="sr-only">BITCOIN</span>
    </span>
  );
};

export default memo(GlitchWordmark);
