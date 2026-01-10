"use client";

import { useEffect, useState } from "react";
import { KButton, KDialog, KDialogContent, KDialogHeader, KDialogTitle, KDialogOverlay } from "kku-ui";
import { getCookie, setCookie } from "@/shared/utils/cookie";
import { NOTICE_COOKIE_KEY } from "@/shared/constants/setting";

export default function DomainNoticeDialog() {

  // region [Hooks]
  const [open, setOpen] = useState(false);
  // endregion

  // region [Events]
  const handleConfirm = () => {
    setOpen(false);
  };

  const handleNeverShowAgain = () => {
    // 3650일(약 10년) 동안 쿠키 유지
    setCookie(NOTICE_COOKIE_KEY, 'true', 3650);
    setOpen(false);
  };

  const handlePointerDownOutside = (e: Event) => {
    e.preventDefault();
  };

  const handleEscapeKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
  };
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    const isHide = getCookie(NOTICE_COOKIE_KEY);

    // 1. 쿠키가 있으면 무조건 표시하지 않음 (최우선)
    if (isHide) return;

    // 2. 쿠키가 없는 상태에서 리다이렉트 파라미터 확인
    const searchParams = new URLSearchParams(window.location.search);
    const isRedirected = searchParams.get('redirected') === 'true';

    // 3. 리다이렉트되어 들어왔거나, 아직 안내를 확인하지 않은(쿠키 없는) 사용자에게 노출
    if (isRedirected || !isHide) {
      setOpen(true);
    }
  }, []);
  // endregion

  return (
    <KDialog open={open} onOpenChange={setOpen} blur={2} size="sm">
      <KDialogOverlay className="z-[52]" />
      <KDialogContent onPointerDownOutside={handlePointerDownOutside} onEscapeKeyDown={handleEscapeKeyDown}
                      className="z-[53]">
        <KDialogHeader>
          <KDialogTitle>
            <strong className="text-lg">도메인 이전 및 서비스 이용 안내</strong>
          </KDialogTitle>
        </KDialogHeader>

        <div className="py-2 flex flex-col gap-4">
          {/* 도메인 비교 섹션 */}
          <div className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-neutral-800 border-border rounded-lg border">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">이전 주소</span>
              <span className="line-through text-gray-400">https://btc-price.web.app</span>
            </div>
            <div className="flex justify-between font-bold text-base">
              <span>신규 주소</span>
              <span className="text-blue-600 underline underline-offset-4">
                <a href="https://only-btc.app" target="_blank" rel="noreferrer">https://only-btc.app</a>
              </span>
            </div>
          </div>

          {/* 안내 본문 */}
          <div className="text-[0.925rem] leading-relaxed text-gray-700 dark:text-neutral-300 space-y-3">
            <p>
              더 나은 환경을 위해 서비스 주소가 변경되었습니다. 기존 주소는 자동으로 이동되지만, 기존 설정값은 보안상 이전되지 않습니다.
              원활한 이용을 위해 새로운 주소에서 설치 및 재설정을 진행해 주시길 부탁드립니다.
            </p>

            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-red-600 dark:text-red-400">
              <p className="font-bold mb-2 text-sm">⚠️ 설정 정보 초기화 안내</p>
              <p className="text-xs opacity-90 leading-normal">
                브라우저 보안 정책상 기존 도메인에 저장된 <strong>설정은 이전이 불가능합니다.</strong>
                새 도메인에서 설정을 다시 진행해 주시기 바랍니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <KButton onClick={handleConfirm} variant="primary" size="lg" width="full">
            확인했습니다
          </KButton>
          <KButton onClick={handleNeverShowAgain} variant="ghost" size="lg" width="full">
            다시 보지 않기
          </KButton>
        </div>
      </KDialogContent>
    </KDialog>
  );
}