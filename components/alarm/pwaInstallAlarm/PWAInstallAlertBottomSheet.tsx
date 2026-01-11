// @/components/PWAInstallAlertBottomSheet.tsx
"use client";

import { useState } from "react";
import {
  KBottomSheet,
  KBottomSheetClose,
  KBottomSheetContent,
  KBottomSheetFooter,
  KBottomSheetHeader,
  KBottomSheetOverlay,
  KBottomSheetTitle,
  KButton,
  KIcon
} from "kku-ui";
import { useInitializePWA } from "@/shared/hooks/initializer";
import { setCookie } from "@/shared/utils/cookie";
import { PWA_COOKIE_KEY } from "@/shared/constants/setting";

export default function PWAInstallAlertBottomSheet() {
  // region [Hooks]
  // AlertManager에 의해 렌더링되면 즉시 열려야 하므로 기본값 true
  const [open, setOpen] = useState(true);
  const { onClickInstall, onClickDisabled } = useInitializePWA();
  // endregion


  // region [Events]
  const onClickClose = () => {
    setCookie(PWA_COOKIE_KEY, 'true', 1); // 하루 안보기 쿠키 저장
    setOpen(false);
    onClickDisabled();
  };

  const handleInstall = async () => {
    await onClickInstall();
    setOpen(false);
  };
  // endregion

  return (
    <KBottomSheet open={open} onOpenChange={setOpen} size="sm">
      <KBottomSheetOverlay />
      <KBottomSheetContent className="border-border z-[51]">
        <KBottomSheetHeader>
          <KBottomSheetTitle>앱 설치 확인</KBottomSheetTitle>
        </KBottomSheetHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-row items-center gap-5">
            <KIcon icon="app" size={48} color="#1796EE" />
            <p className="flex-1 text-[15px] leading-tight font-medium break-keep text-gray-800 dark:text-gray-300">
              앱으로 설치하여 홈 화면에서 더 빠르고 편리하게 이용해 보세요.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl px-3 py-4 flex flex-col gap-2 text-[14px] text-gray-700">
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 mt-0.5">1.</span>
              <p className="flex-1 leading-6 dark:text-gray-100">아래 <strong>'설치'</strong> 버튼을 클릭해 주세요.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 mt-0.5">2.</span>
              <p className="flex-1 leading-6 dark:text-gray-100">브라우저 팝업창에서 <strong>'설치'</strong> 또는 <strong>'추가'</strong>를 선택하면 완료됩니다.</p>
            </div>
          </div>
        </div>

        <KBottomSheetFooter>
          <KButton variant="primary" width="full" onClick={handleInstall}>설치</KButton>
          <KBottomSheetClose asChild>
            <KButton variant="ghost" width="full" onClick={onClickClose}>오늘 하루 안보기</KButton>
          </KBottomSheetClose>
        </KBottomSheetFooter>
      </KBottomSheetContent>
    </KBottomSheet>
  );
}