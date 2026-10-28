"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  BAKE_PADDING_IN_CSS_PX,
  prefersReducedMotion,
  type WordmarkFontId,
} from "@/shared/lib/wordmark-canvas";
import { bakePgpArmorCanvas } from "../lib/bakePgpArmorCanvas";
import type { PgpArmorPreset } from "../model/pgpArmorPreset";

/** 커서가 깜빡이는 주기(ms). 터미널 커서의 관례적인 속도. */
const CURSOR_BLINK_INTERVAL_IN_MS = 600;

interface PgpArmorBlockProps {
  preset: PgpArmorPreset;
  /** 워드마크 줄에 쓸 폰트. 아머 본문은 줄이 맞아야 해서 항상 등폭으로 고정된다. */
  fontId?: WordmarkFontId;
  className?: string;
}

const PgpArmorBlock = ({ preset, fontId = "pretendard", className = "" }: PgpArmorBlockProps) => {
  // region [Hooks]
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isBakeFailed, setIsBakeFailed] = useState(false);
  // endregion

  // region [Life Cycles]
  /**
   * 커서 on/off 두 판을 굽고 번갈아 그린다.
   *
   * 깜빡임이 이 시안의 유일한 움직임이라 `requestAnimationFrame` 이 필요 없다.
   * 600ms 짜리 `setInterval` 하나로 끝나고, 화면 밖이면 그마저도 멈춘다.
   */
  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null) {
      return;
    }

    let isEffectCancelled = false;
    let blinkIntervalID: number | null = null;
    let intersectionObserver: IntersectionObserver | null = null;

    const attachArmorBlock = async () => {
      try {
        const bakedArmor = await bakePgpArmorCanvas(preset, fontId);

        if (isEffectCancelled) {
          return;
        }

        const { cursorVisibleCanvas, cursorHiddenCanvas, widthInDevicePx, heightInDevicePx } =
          bakedArmor;

        canvas.width = widthInDevicePx;
        canvas.height = heightInDevicePx;

        const context = canvas.getContext("2d");

        if (context === null) {
          return;
        }

        let isCursorVisible = true;

        const drawCurrentFrame = () => {
          context.clearRect(0, 0, widthInDevicePx, heightInDevicePx);
          context.drawImage(isCursorVisible ? cursorVisibleCanvas : cursorHiddenCanvas, 0, 0);
        };

        const stopBlinking = () => {
          if (blinkIntervalID !== null) {
            window.clearInterval(blinkIntervalID);
            blinkIntervalID = null;
          }
        };

        const startBlinking = () => {
          // 모션을 끈 사용자에게는 커서가 켜진 판을 그대로 둔다. 블록 자체는 정지 이미지다.
          if (blinkIntervalID !== null || prefersReducedMotion()) {
            return;
          }

          blinkIntervalID = window.setInterval(() => {
            isCursorVisible = !isCursorVisible;
            drawCurrentFrame();
          }, CURSOR_BLINK_INTERVAL_IN_MS);
        };

        drawCurrentFrame();

        intersectionObserver = new IntersectionObserver((entries) => {
          const isBlockVisible = entries.some((entry) => entry.isIntersecting);

          if (isBlockVisible) {
            startBlinking();
            return;
          }
          stopBlinking();
        });
        intersectionObserver.observe(canvas);
      } catch (bakeError) {
        console.error("[PgpArmorBlock] 아머 블록 굽기 실패", bakeError);

        if (!isEffectCancelled) {
          setIsBakeFailed(true);
        }
      }
    };

    attachArmorBlock();

    return () => {
      isEffectCancelled = true;
      intersectionObserver?.disconnect();

      if (blinkIntervalID !== null) {
        window.clearInterval(blinkIntervalID);
      }
    };
  }, [preset, fontId]);
  // endregion

  // region [Templates]
  if (isBakeFailed) {
    return (
      <pre
        className={`font-jetbrains text-[9px] leading-[1.5] text-neutral-500 ${className}`}
        style={{ width: preset.widthInCssPx }}
      >
        {[...preset.headerLines, "", "BITCOIN", "", ...preset.signatureLines].join("\n")}
      </pre>
    );
  }
  // endregion

  return (
    <span
      className={`relative inline-block align-middle ${className}`}
      style={{ width: preset.widthInCssPx, height: preset.heightInCssPx }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          left: -BAKE_PADDING_IN_CSS_PX,
          top: -BAKE_PADDING_IN_CSS_PX,
          width: preset.widthInCssPx + BAKE_PADDING_IN_CSS_PX * 2,
          height: preset.heightInCssPx + BAKE_PADDING_IN_CSS_PX * 2,
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </span>
      <span className="sr-only">BITCOIN</span>
    </span>
  );
};

export default memo(PgpArmorBlock);
