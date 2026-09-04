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
import { isAndroidDevice, isIOSDevice } from "@/shared/utils/device";

interface ChatInstallGuideProps {
  onClose: () => void;
}

export default function ChatInstallGuide({ onClose }: ChatInstallGuideProps) {
  // region [Hooks]
  const deferredPrompt = useSettingStore((store) => store.setting.deferredPrompt);
  // 부모가 열릴 때만 마운트하므로 기본값 true
  const [isSheetOpen, setIsSheetOpen] = useState(true);
  const [hasRequestedInstall, setHasRequestedInstall] = useState(false);
  const isIOSOperatingSystem = isIOSDevice();
  const isAndroidOperatingSystem = isAndroidDevice();
  const canInstallDirectly = !!deferredPrompt && !isIOSOperatingSystem && !hasRequestedInstall;
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

  // region [Templates]
  const IOSInstallGuideTemplate = (
    <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl px-4 py-4 text-[14px]">
      <p className="mb-2 font-semibold text-gray-900 dark:text-gray-100">iPhone · iPad 설치 방법</p>
      <ol className="flex list-decimal flex-col gap-2 pl-5 marker:font-bold marker:text-blue-600">
        <li className="pl-1 leading-6 dark:text-gray-100">
          Safari에서 이 페이지를 연 뒤 <strong>공유 버튼</strong>
          <span className="inline-block align-middle mx-1 -translate-y-[2px]">
            <IosShareIcon size={22} color="#4082E0" />
          </span>
          을 눌러 주세요.
        </li>
        <li className="pl-1 leading-6 dark:text-gray-100">
          <strong>&apos;홈 화면에 추가&apos;</strong>를 선택하고,
          <strong> &apos;웹 앱으로 열기&apos;</strong>를 켠 뒤 추가해 주세요.
        </li>
        <li className="pl-1 leading-6 dark:text-gray-100">
          Safari 탭을 닫고 홈 화면의 <strong>온리 비트코인</strong> 아이콘으로 실행한 뒤 채팅 버튼을
          눌러 주세요.
        </li>
      </ol>
    </div>
  );

  const AndroidInstallGuideTemplate = (
    <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl px-4 py-4 text-[14px]">
      <p className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Android 설치 방법</p>
      <ol className="flex list-decimal flex-col gap-2 pl-5 marker:font-bold marker:text-blue-600">
        <li className="pl-1 leading-6 dark:text-gray-100">
          아래 <strong>&apos;앱 설치&apos;</strong> 버튼을 눌러 주세요. 버튼이 보이지 않으면
          Chrome의 <strong>더보기 → 홈 화면에 추가 → 설치</strong>를 선택해 주세요.
        </li>
        <li className="pl-1 leading-6 dark:text-gray-100">
          설치 팝업에서 <strong>&apos;설치&apos;</strong>를 선택해 주세요.
        </li>
        <li className="pl-1 leading-6 dark:text-gray-100">
          현재 탭을 닫고 홈 화면의 <strong>온리 비트코인</strong> 아이콘으로 실행한 뒤 채팅 버튼을
          눌러 주세요.
        </li>
      </ol>
    </div>
  );

  const OtherBrowserInstallGuideTemplate = (
    <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl px-4 py-4 text-[14px]">
      <p className="mb-2 font-semibold text-gray-900 dark:text-gray-100">앱 설치 방법</p>
      <ol className="flex list-decimal flex-col gap-2 pl-5 marker:font-bold marker:text-blue-600">
        <li className="pl-1 leading-6 dark:text-gray-100">
          아래 <strong>&apos;앱 설치&apos;</strong> 버튼이나 브라우저 메뉴의 앱 설치 항목을 선택해
          주세요.
        </li>
        <li className="pl-1 leading-6 dark:text-gray-100">
          설치된 <strong>온리 비트코인</strong> 앱을 실행한 뒤 채팅 버튼을 눌러 주세요.
        </li>
      </ol>
    </div>
  );

  let InstallGuideTemplate = OtherBrowserInstallGuideTemplate;

  if (isIOSOperatingSystem) {
    InstallGuideTemplate = IOSInstallGuideTemplate;
  } else if (isAndroidOperatingSystem) {
    InstallGuideTemplate = AndroidInstallGuideTemplate;
  }
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
          <KBottomSheetDescription>
            설치한 앱에서만 참여할 수 있는 회원가입 없는 공개 채팅입니다.
          </KBottomSheetDescription>
        </KBottomSheetHeader>

        {InstallGuideTemplate}

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
