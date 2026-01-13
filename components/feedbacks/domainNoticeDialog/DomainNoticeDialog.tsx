"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { KButton, KDialog, KDialogContent, KDialogHeader, KDialogTitle, KDialogOverlay, KDialogFooter } from "kku-ui";
import { setCookie } from "@/shared/utils/cookie";
import { NOTICE_COOKIE_KEY } from "@/shared/constants/setting";


export default function DomainNoticeDialog() {

  // region [Hooks]
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = new URLSearchParams(window.location.search);
  const [open, setOpen] = useState(true); // AlertManager에 의해 렌더링되면 즉시 열려야 하므로 기본값 true
  // endregion


  // region [Privates]
  const handlePointerDownOutside = (e: Event) => {
    e.preventDefault();
  };

  const handleEscapeKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
  };

  const handleQueryString = () => {
    if (!open) {
      searchParams.delete("redirected");
      const query = searchParams.toString();
      const path = query ? `${pathname}?${query}` : pathname;

      router.replace(path, { scroll: false });
    }
  }
  // endregion


  // region [Events]
  const handleConfirm = () => {
    setOpen(false);
  };

  const handleNeverShowAgain = () => {
    // 일주일 동안 쿠키 유지
    setCookie(NOTICE_COOKIE_KEY, 'true', 7);
    setOpen(false);
  };
  // endregion


  // region [Life Cycles]
  useEffect(handleQueryString, [open]);
  // endregion


  return (
    <KDialog open={open} onOpenChange={setOpen} blur={2} size="sm">
      <KDialogOverlay className="z-[100]" />
      <KDialogContent
        onPointerDownOutside={handlePointerDownOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
        className="z-[101] !pointer-events-auto"
      >
        <KDialogHeader>
          <KDialogTitle>
            <strong className="text-lg">도메인 이전 및 서비스 이용 안내</strong>
          </KDialogTitle>
        </KDialogHeader>

        <div className="py-2 flex flex-col gap-4">
          <p className="text-[13px] text-blue-600 dark:text-blue-400 font-medium">
            ⚡️ 기존 주소를 통해 접속하신 분들께 드리는 안내입니다.
          </p>

          {/* 도메인 비교 섹션 */}
          <div className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-neutral-800 border-border rounded-lg border">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">이전 주소</span>
              <span className="line-through text-gray-400 italic font-light">https://btc-price.web.app</span>
            </div>
            <div className="flex justify-between font-bold text-base">
              <span>신규 주소</span>
              <span className="text-blue-600 underline underline-offset-4">
                <a href="https://only-btc.app" target="_blank" rel="noreferrer">https://only-btc.app</a>
              </span>
            </div>
          </div>

          {/* 안내 본문 */}
          <div className="text-[0.925rem] leading-relaxed text-gray-700 dark:text-neutral-300 space-y-3 px-2 tracking-tight">
            <p>
              더 나은 환경을 위해 서비스 주소가 변경되었습니다. 기존 주소는 자동으로 이동되지만, 기존 설정값은 보안상 이전되지 않습니다.
              원활한 이용을 위해 새로운 주소에서 <strong>설치 및 재설정</strong>을 진행해 주시길 부탁드립니다.
            </p>
          </div>
        </div>

        <KDialogFooter className="flex flex-col gap-2">
          <KButton onClick={handleConfirm} variant="primary" size="lg" width="full" >
            확인
          </KButton>
          {/* <KButton onClick={handleNeverShowAgain} variant="default" size="lg" width="full" className="!m-0"> */}
          {/*   일주일 동안 보지 않기 */}
          {/* </KButton> */}
        </KDialogFooter>
      </KDialogContent>
    </KDialog>
  );
}