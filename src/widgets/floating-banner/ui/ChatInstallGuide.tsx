"use client";

import {
  KBottomSheet,
  KBottomSheetClose,
  KBottomSheetContent,
  KBottomSheetDescription,
  KBottomSheetFooter,
  KBottomSheetHeader,
  KBottomSheetOverlay,
  KBottomSheetTitle,
  KButton,
} from "kku-ui";
import { useState } from "react";
import useSettingStore from "@/shared/stores/settingStore";
import { IosShareIcon } from "@/shared/ui";
import { isIOSSafari } from "@/shared/utils/device";

interface ChatInstallGuideProps {
  onClose: () => void;
}

export default function ChatInstallGuide({ onClose }: ChatInstallGuideProps) {
  // region [Hooks]
  const deferredPrompt = useSettingStore((store) => store.setting.deferredPrompt);
  // 부모가 열릴 때만 마운트하므로 기본값 true
  const [isSheetOpen, setIsSheetOpen] = useState(true);
  const [hasRequestedInstall, setHasRequestedInstall] = useState(false);
  const isIosBrowser = isIOSSafari();
  const canInstallDirectly = !!deferredPrompt && !isIosBrowser && !hasRequestedInstall;
  // endregion

  // region [Events]
  const onOpenChangeSheet = (nextOpen: boolean): void => {
    setIsSheetOpen(nextOpen);
  };

  /** 닫기 애니메이션이 끝난 뒤 언마운트해야 시트가 끊기지 않음. */
  const onAnimationEndSheet = (openState: boolean): void => {
    if (!openState) {
      onClose();
    }
  };

  const onClickInstall = async (): Promise<void> => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setHasRequestedInstall(true);
  };
  // endregion

  return (
    <KBottomSheet
      open={isSheetOpen}
      onOpenChange={onOpenChangeSheet}
      onAnimationEnd={onAnimationEndSheet}
      size="sm"
    >
      <KBottomSheetOverlay />
      <KBottomSheetContent className="border-border z-[51]">
        <KBottomSheetHeader>
          <KBottomSheetTitle>앱에서 채팅을 이용해 보세요</KBottomSheetTitle>
          <KBottomSheetDescription>회원가입 없는 공개 채팅입니다.</KBottomSheetDescription>
        </KBottomSheetHeader>

        <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl px-3 py-4 flex flex-col gap-2 text-[14px]">
          {isIosBrowser ? (
            <>
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-600 mt-1">1.</span>
                <div className="flex-1 leading-6 dark:text-gray-100">
                  Safari 하단의 <strong>공유 버튼</strong>
                  <span className="inline-block align-middle mx-1 -translate-y-[2px]">
                    <IosShareIcon size={22} color="#4082E0" />
                  </span>
                  을 눌러 주세요.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-600 mt-0.5">2.</span>
                <p className="flex-1 leading-6 dark:text-gray-100">
                  <strong>'홈 화면에 추가'</strong>를 선택해 설치합니다.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-600 mt-0.5">3.</span>
                <p className="flex-1 leading-6 dark:text-gray-100">
                  홈 화면의 온리 비트코인 아이콘으로 다시 실행합니다.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-600 mt-0.5">1.</span>
                <p className="flex-1 leading-6 dark:text-gray-100">
                  아래 <strong>'앱 설치'</strong> 버튼 또는 브라우저 메뉴에서 앱을 설치합니다.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-600 mt-0.5">2.</span>
                <p className="flex-1 leading-6 dark:text-gray-100">
                  현재 탭을 닫고 홈 화면의 앱 아이콘으로 다시 실행합니다.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-blue-600 mt-0.5">3.</span>
                <p className="flex-1 leading-6 dark:text-gray-100">
                  앱의 채팅 버튼을 눌러 참여합니다.
                </p>
              </div>
            </>
          )}
        </div>

        {hasRequestedInstall && (
          <p className="text-xs text-center leading-5 text-gray-500">
            설치가 끝났다면 홈 화면 아이콘으로 다시 실행해 주세요. 현재 브라우저 탭에서는 채팅을
            열지 않습니다.
          </p>
        )}

        <KBottomSheetFooter>
          {canInstallDirectly && (
            <KButton variant="primary" width="full" onClick={onClickInstall}>
              앱 설치
            </KButton>
          )}
          <KBottomSheetClose asChild>
            <KButton variant="ghost" width="full">
              닫기
            </KButton>
          </KBottomSheetClose>
        </KBottomSheetFooter>
      </KBottomSheetContent>
    </KBottomSheet>
  );
}
