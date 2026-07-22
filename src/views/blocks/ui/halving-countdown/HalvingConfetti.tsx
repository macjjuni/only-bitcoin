"use client";

import Lottie from "lottie-react";
import { type CSSProperties, useCallback, useEffect, useState } from "react";

const ROOT_STYLE: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  zIndex: 9999,
};

// 원본이 1500x2000 세로형이라 가로 화면에서 여백이 생긴다. slice(cover)로 채운다.
const RENDERER_SETTINGS = { preserveAspectRatio: "xMidYMid slice" };

interface HalvingConfettiProps {
  /** 반감기 도달 시 true. */
  isActive: boolean;
  /** 재생 종료 시 호출된다. 부모가 isActive 를 내려야 한다. */
  onComplete: () => void;
}

/**
 * 반감기 도달 연출용 컨페티.
 * 블록 채굴 시 터지는 전역 `ConfettiEffect`(canvas)와는 트리거·구현이 별개다.
 */
const HalvingConfetti = ({ isActive, onComplete }: HalvingConfettiProps) => {
  // region [Hooks]
  const [animationData, setAnimationData] = useState<unknown>(null);
  // endregion

  // region [Transactions]
  /**
   * 애니메이션 JSON(365KB)을 최초 재생 시점에 지연 로드한다.
   * 정적 import 시 카운트다운 페이지 초기 번들이 그만큼 무거워진다.
   */
  const fetchAnimationData = useCallback(async () => {
    const { default: data } = await import("@/shared/assets/lottie/confetti.json");
    setAnimationData(data);
  }, []);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    if (!isActive || animationData) return;

    fetchAnimationData();
  }, [isActive, animationData, fetchAnimationData]);
  // endregion

  if (!isActive || !animationData) return null;

  return (
    <Lottie
      animationData={animationData}
      loop={false}
      onComplete={onComplete}
      rendererSettings={RENDERER_SETTINGS}
      style={ROOT_STYLE}
    />
  );
};

export default HalvingConfetti;
