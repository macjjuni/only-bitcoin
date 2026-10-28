"use client";

import { useEffect, useRef, useState } from "react";
import useSettingStore from "@/shared/stores/settingStore";
import DitherLogo from "./DitherLogo";

// region [Constants]
/** 배경이라 점을 조금 키워 1비트 질감을 살림. */
const BACKGROUND_CELL_SIZE_IN_CSS_PX = 3;

/** 광원 한 바퀴 12초 · 12fps. 상주 배경이라 로고보다 느리고 가볍게 둠. */
const BACKGROUND_CYCLE_IN_MS = 12000;
const BACKGROUND_FRAME_INTERVAL_IN_MS = 83;

/** 예전 배경( 이미지 위 80% 덮개 )과 비슷한 진하기. 라이트는 검은 점이 더 세게 보여서 낮춤. */
const BACKGROUND_OPACITY_BY_THEME = { dark: 0.2, light: 0.12 };

/** 폭이 이만큼 바뀔 때만 다시 구움. 주소창 접힘 같은 미세한 변화마다 굽지 않게 함. */
const SIZE_STEP_IN_CSS_PX = 8;
// endregion

/**
 * 화면 중앙에 고정으로 까는 1-bit 디더 로고 배경.
 *
 * 크기는 `globals.css` 의 `.dither-background` 폭( 화면 폭 비율 )을 따름. 캔버스는 px 로 구워야 해서
 * 박스 폭을 재서 `DitherLogo` 에 넘김. 설정의 배경 스위치( `isBackgroundImg` )가 켜졌을 때만 그리고,
 * 탭이 안 보이면 멈춤. 다크는 흰 점, 라이트는 검은 점.
 */
export default function DitherBackground() {
  // region [Hooks]
  const isBackgroundImg = useSettingStore((state) => state.setting.isBackgroundImg);
  const theme = useSettingStore((state) => state.theme);
  const boxRef = useRef<HTMLDivElement>(null);
  const [logoSizeInCssPx, setLogoSizeInCssPx] = useState(0);
  // endregion

  // region [Privates]
  const isDarkTheme = theme === "dark";
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    const box = boxRef.current;

    if (box === null) {
      return;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      const steppedSize =
        Math.round(entry.contentRect.width / SIZE_STEP_IN_CSS_PX) * SIZE_STEP_IN_CSS_PX;
      setLogoSizeInCssPx(steppedSize);
    });
    resizeObserver.observe(box);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isBackgroundImg]);
  // endregion

  if (!isBackgroundImg) {
    return null;
  }

  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      className="dither-background"
      style={{ opacity: BACKGROUND_OPACITY_BY_THEME[isDarkTheme ? "dark" : "light"] }}
    >
      {logoSizeInCssPx > 0 && (
        <DitherLogo
          sizeInCssPx={logoSizeInCssPx}
          color={isDarkTheme ? "#FFFFFF" : "#000000"}
          light="orbit"
          cycleInMs={BACKGROUND_CYCLE_IN_MS}
          frameIntervalInMs={BACKGROUND_FRAME_INTERVAL_IN_MS}
          cellSizeInCssPx={BACKGROUND_CELL_SIZE_IN_CSS_PX}
        />
      )}
    </div>
  );
}
