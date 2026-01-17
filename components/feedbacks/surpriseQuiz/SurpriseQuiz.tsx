"use client";

import useQuizState from "@/components/feedbacks/surpriseQuiz/useQuizState";
import { getCookie, setCookie } from "@/shared/utils/cookie";
import { useEffect, useRef, useState } from "react";
import {
  KButton,
  KDialog,
  KDialogContent,
  KDialogDescription,
  KDialogFooter,
  KDialogHeader,
  KDialogOverlay,
  KDialogTitle
} from "kku-ui";
import { QRCode } from "react-qrcode-logo";
import useCopyOnClick from "../../../shared/hooks/useCopyOnClick";

export default function SurpriseQuiz() {

  // region [Hooks]
  const qrDivRef = useRef<HTMLDivElement>(null);
  const { isVisible, setIsVisible, quizData, setQuizData } = useQuizState();
  const [isIconVisible, setIsIconVisible] = useState(false);
  const [rewardLnurl, setRewardLnurl] = useState<string | null>(null);
  const [isStepReward, setIsStepReward] = useState(false);
  const handleCopyLnurl = useCopyOnClick(qrDivRef);
  // endregion


  // region [Privates]
  const isDev = process.env.NODE_ENV === "development";

  const rollProbability = () => {
    if (isDev) return true;
    return Math.random() < 0.2;
  };

  const getDeviceState = () => {
    if (typeof window === "undefined") return { isMobile: false, isPWA: false };
    // 1. 일반적인 모바일 체크
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth <= 768;
    // 2. PWA 실행 여부 체크 (Standalone 모드)
    const isPWA =
      window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone || // iOS Safari 전용
      document.referrer.includes("android-app://");   // Android TWA 전용
    return { isMobile, isPWA };
  };

  const isMobileDevice = () => {
    const { isMobile, isPWA } = getDeviceState();
    return isMobile && isPWA;
  };

  const hasCooldown = () => !!getCookie("quiz_cooldown");
  const setCooldown = () => setCookie("quiz_cooldown", "true", 0.125);
  // endregion


  // region [Events]
  const handleIconClick = () => {
    setIsVisible(true);
    setIsIconVisible(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsVisible(open);
    if (!open) {
      // 닫힐 때 상태 초기화
      setTimeout(() => {
        setIsStepReward(false);
        setRewardLnurl(null);
      }, 300);
    }
  };

  const handleAnswerSelect = (selected: string) => {
    if (selected === quizData?.answer) {
      generateReward();
    } else {
      alert("아쉽네요, 오답입니다. 🥲");
      setIsVisible(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };
  // endregion


  // region [Transactions]
  const fetchServerQuiz = async () => {
    try {
      const response = await fetch("/api/quiz/random");
      const result = await response.json();

      if (result.success) {
        setQuizData(result.data);
        setIsIconVisible(true);
      }
    } catch (error) {
      console.error("퀴즈 호출 실패:", error);
    } finally {
      setCooldown();
    }
  };

  const generateReward = async () => {
    try {
      const response = await fetch("/api/quiz/reward/generate", { method: "POST" });
      const result = await response.json();

      if (result.success) {
        setRewardLnurl(result.lnurl);
        setIsStepReward(true);
      }
    } catch (error) {
      console.error("보상 생성 실패:", error);
      alert("보상 생성 중 오류가 발생했습니다.");
    }
  };
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    // 1. 디바이스 체크 및 쿨다운 체크
    if (!isMobileDevice() || hasCooldown()) return;

    const waitTime = isDev ? 2000 : 30000; // 진입 후 30초 대기

    const timer = setTimeout(() => {
      // 2. [핵심] 30초 뒤에 20% 확률 주사위를 굴림
      if (rollProbability()) {
        fetchServerQuiz().then();
      } else {
        // 당첨되지 않아도 다음 기회를 위해 쿨다운은 설정 (안 하면 계속 굴리게 됨)
        console.log("Next time! Probability roll failed.");
        setCooldown();
      }
    }, waitTime);

    return () => clearTimeout(timer);
  }, []);
  // endregion

  if (!quizData) return null;

  return (
    <>
      {/* region Floating Trigger Icon */}
      {isIconVisible && (
        <button
          onClick={handleIconClick}
          className="fixed top-[10px] right-[80px] z-[40] flex w-[40px] h-[40px] text-2xl rounded-full animate-bounce items-center justify-center transition-transform active:scale-90"
          style={{ animationDuration: "2s" }}
        >
          🎁
        </button>
      )}
      {/* endregion */}

      <KDialog open={isVisible} onOpenChange={handleOpenChange} size="sm" blur={4}>
        <KDialogOverlay />
        <KDialogContent className="p-4 overflow-hidden">
          {!isStepReward ? (
            // [Step 1: Quiz UI]
            <>
              <KDialogHeader className="items-center text-center">
                <div className="text-4xl">🎁</div>
                <KDialogTitle className="text-2xl font-black">깜짝 비트코인 퀴즈!</KDialogTitle>
                <KDialogDescription className="text-base font-medium break-keep pt-2">
                  {quizData.question}
                </KDialogDescription>
              </KDialogHeader>

              <div className="grid gap-3 py-4">
                {quizData.options.map((option) => (
                  <KButton key={option} variant="outline" width="full" className="text-lg font-bold h-10"
                           onClick={() => handleAnswerSelect(option)}>
                    {option}
                  </KButton>
                ))}
              </div>
            </>
          ) : (
            // [Step 2: Reward QR UI]
            <div className="flex flex-col items-center text-center">
              <KDialogHeader className="items-center">
                <KDialogTitle className="text-2xl font-black mb-3 text-orange-500">
                  정답! 설마 비트맥시!?
                </KDialogTitle>
                <KDialogDescription className="text-base font-medium">
                  라이트닝 월렛으로 <strong className="text-base">100 Sats</strong>를 받으세요!
                </KDialogDescription>
              </KDialogHeader>

              <div ref={qrDivRef} data-copy={rewardLnurl}
                   className="my-4 rounded-2xl bg-white p-1 shadow-inner border-4 border-orange-400">
                {rewardLnurl && (
                  <QRCode
                    value={rewardLnurl}
                    size={250}
                    logoImage="https://bitcoin.org/img/icons/logo_ios.png"
                    logoWidth={55}
                    qrStyle="squares"
                  />
                )}
              </div>
              <KButton variant="primary" onClick={handleCopyLnurl} className="mb-4 gap-2">
                🔗 인보이스 복사
              </KButton>
              <p className="text-[11px] text-muted-foreground break-keep px-6 leading-relaxed">
                60분 이내에 라이트닝 월렛으로 스캔하거나 <br />인보이스 주소를 복사하여 보상을 받으세요
              </p>
            </div>
          )}

          <KDialogFooter className="sm:justify-center mt-2 border-t pt-2">
            <KButton variant="ghost" width="full" onClick={handleClose}>
              {isStepReward ? "닫기" : "다음에 풀기"}
            </KButton>
          </KDialogFooter>
        </KDialogContent>
      </KDialog>
    </>
  );
}