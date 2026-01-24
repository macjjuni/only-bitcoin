"use client";

import { useEffect, useRef, useState } from "react";
import useQuizState from "@/components/feedbacks/surpriseQuiz/useQuizState";
import { deleteCookie, getCookie, setCookie } from "@/shared/utils/cookie";
import {
  KButton,
  KDialog,
  KDialogContent,
  KDialogDescription,
  KDialogFooter,
  KDialogHeader,
  KDialogOverlay,
  KDialogTitle,
  KSpinner
} from "kku-ui";
import { QRCode } from "react-qrcode-logo";
import useCopyOnClick from "@/shared/hooks/useCopyOnClick";
import { QUIZ_COOKIE_KEY, QUIZ_MIN_COUNT } from "@/shared/constants/setting";


// region [Privates]
const LIMIT_KEY = `${QUIZ_COOKIE_KEY}_done`;
const COUNT_COOLDOWN_KEY = `${QUIZ_COOKIE_KEY}_cd`;
const isDev = process.env.NODE_ENV === "development";

const checkPwaEnv = (): boolean => {
  if (typeof window === "undefined") return false;

  // 모바일 여부 확인
  const isMobile = /Mobi|Android|iPhone/i.test(window.navigator.userAgent) || window.innerWidth <= 768;

  // PWA 여부 확인 (iOS standalone 속성 대응을 위한 타입 단언)
  const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;
  const isIOSStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  const isPWA = isStandaloneMode || !!isIOSStandalone;

  return isDev ? true : (isMobile && isPWA);
};

const getVisitCount = () => parseInt(getCookie(QUIZ_COOKIE_KEY) || "0");
const setVisitCount = (count: number) => setCookie(QUIZ_COOKIE_KEY, count.toString(), 1);

const canIncrementCount = () => !getCookie(COUNT_COOLDOWN_KEY);
const setCountCooldown = () => setCookie(COUNT_COOLDOWN_KEY, "true", 1 / 24); // 1시간 쿨다운

const finishQuizSession = () => {
  deleteCookie(QUIZ_COOKIE_KEY); // 누적 카운트 삭제
  setCookie(LIMIT_KEY, "true", 1); // 1일 쿨다운 쿠키 생성
};
// endregion

export default function SurpriseQuiz() {
  // region [Hooks]
  const qrDivRef = useRef<HTMLDivElement>(null);
  const { isVisible, setIsVisible, quizData, setQuizData } = useQuizState();
  const [isIconVisible, setIsIconVisible] = useState(false);
  const [rewardLnurl, setRewardLnurl] = useState<string | null>(null);
  const [isStepReward, setIsStepReward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const handleCopyLnurl = useCopyOnClick(qrDivRef);
  // endregion

  // region [Events]
  const handleAnswerSelect = (selected: string) => {
    verifyAnswer(selected).then();
  };

  const handleClose = () => {
    setIsVisible(false);
    setIsIconVisible(false);
    finishQuizSession(); // [핵심] 리밋 쿠키 설정 및 카운트 초기화
    setTimeout(() => {
      setIsStepReward(false);
      setRewardLnurl(null);
    }, 300);
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
      } else {
        // 서버에서 확률 등으로 거절당하면 즉시 카운트 리셋 및 쿨다운
        finishQuizSession();
      }
    } catch (error) {
      console.error("퀴즈 호출 실패:", error);
    }
  };

  const verifyAnswer = async (answer: string) => {
    if (!quizData?.id) return;
    setIsLoading(true);

    try {
      const response = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: quizData.id, answer })
      });
      const result = await response.json();

      if (result.success && result.answerToken) {
        await generateReward(result.answerToken);
      } else {
        alert("오답입니다! 🥲");
        handleClose();
      }
    } catch (error) {
      console.error("정답 검증 실패:", error);
      alert("오류가 발생했습니다. 🤖");
    }
  };

  const generateReward = async (answerToken: string) => {
    try {
      const response = await fetch("/api/quiz/reward/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerToken })
      });
      const result = await response.json();
      if (result.success) {
        setRewardLnurl(result.lnurl);
        setIsStepReward(true);
      } else {
        alert("보상 생성 실패");
      }
    } catch (error) {
      console.error("보상 생성 실패:", error);
      alert("보상 생성 실패");
    }
  };
  // endregion

  // region [Privates]
  const tryIncrementCount = () => {
    // 퀴즈 완료 쿨다운 체크
    if (getCookie(LIMIT_KEY)) return;
    // 카운트 증가 쿨다운 체크
    if (!canIncrementCount()) return;

    const currentCount = getVisitCount();
    const nextCount = currentCount + 1;

    setVisitCount(nextCount);
    setCountCooldown(); // 1시간 카운트 증가 쿨다운 설정

    if (nextCount >= QUIZ_MIN_COUNT) {
      fetchServerQuiz().then();
    }
  };
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    // 개발 환경: 조건 없이 바로 퀴즈 시작
    if (isDev) {
      const timer = setTimeout(() => fetchServerQuiz(), 2000);
      return () => clearTimeout(timer);
    }

    // 프로덕션 환경: PWA 환경만 허용
    if (!checkPwaEnv()) return;

    // 초기 마운트 시 카운트 증가 시도 (15초 후)
    const timer = setTimeout(tryIncrementCount, 15000);

    // 백그라운드에서 복귀 시 카운트 증가 시도
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        tryIncrementCount();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  // endregion

  const canRender = isIconVisible || isVisible || isStepReward;

  if (!canRender) return null;

  return (
    <>
      {isIconVisible && (
        <button onClick={() => setIsVisible(true)}
                className="fixed top-[10px] right-[80px] z-[40] flex w-[40px] h-[40px] text-2xl animate-bounce items-center justify-center">
          🎁
        </button>
      )}

      <KDialog open={isVisible} onOpenChange={handleClose} size="sm" blur={4}>
        <KDialogOverlay />
        <KDialogContent className="p-4">
          {!isStepReward ? (
            <>
              <KDialogHeader className="items-center text-center">
                <div className="text-4xl">🎁</div>
                <KDialogTitle className="text-2xl font-black">깜짝 비트코인 퀴즈!</KDialogTitle>
                <KDialogDescription className="pt-2 text-md">{quizData?.question}</KDialogDescription>
              </KDialogHeader>
              <div className="relative grid gap-3 py-4">
                {quizData?.options.map((option) => (
                  <KButton key={option} variant="outline" width="full"
                           className={`font-bold h-10 ${isLoading && "opacity-0"}`}
                           disabled={isLoading}
                           onClick={() => handleAnswerSelect(option)}>
                    {option}
                  </KButton>
                ))}
                {isLoading &&
                  <KSpinner size="xl" className="absolute top-1/2 left-1/2 -mt-[26px] -ml-[26px]" />}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center text-center">
              <KDialogHeader className="items-center">
                <KDialogTitle className="text-2xl font-black mb-3 text-orange-500">⚡️ 정답입니다! ⚡️</KDialogTitle>
                <KDialogDescription>100 Sats를 받으세요!</KDialogDescription>
                <KDialogDescription className="text-red-500">창을 닫으면 보상을 받을 수 없습니다.</KDialogDescription>
              </KDialogHeader>
              <div ref={qrDivRef} data-copy={rewardLnurl}
                   className="my-4 rounded-2xl bg-white p-1 border-4 border-orange-400">
                {rewardLnurl &&
                  <QRCode value={rewardLnurl} size={250} logoImage="https://bitcoin.org/img/icons/logo_ios.png"
                          logoWidth={55} qrStyle="squares" />}
              </div>
              <KButton variant="primary" onClick={handleCopyLnurl} className="mb-4 gap-2">🔗 인보이스 복사</KButton>
              <p className="text-[11px] text-muted-foreground break-keep px-6 leading-relaxed">
                60분 이내에 라이트닝 월렛으로 스캔하거나 <br />인보이스 주소를 복사하여 보상을 받으세요
              </p>
            </div>
          )}
          <KDialogFooter className="mt-2 border-t pt-2">
            <KButton variant="ghost" width="full" onClick={handleClose}>닫기</KButton>
          </KDialogFooter>
        </KDialogContent>
      </KDialog>
    </>
  );
}