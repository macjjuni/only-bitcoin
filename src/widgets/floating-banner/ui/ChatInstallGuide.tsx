"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSettingStore from "@/shared/stores/settingStore";
import { isIOSSafari } from "@/shared/utils/device";

interface ChatInstallGuideProps {
  onClose: () => void;
}

export default function ChatInstallGuide({ onClose }: ChatInstallGuideProps) {
  // region [Hooks]
  const deferredPrompt = useSettingStore((store) => store.setting.deferredPrompt);
  const closeButtonReference = useRef<HTMLButtonElement | null>(null);
  const [hasRequestedInstall, setHasRequestedInstall] = useState(false);
  const isIosBrowser = isIOSSafari();
  // endregion

  // region [Events]
  const onClickCloseButton = (): void => {
    onClose();
  };

  const onClickInstallButton = async (): Promise<void> => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setHasRequestedInstall(true);
  };

  const onKeyDownDialog = (keyboardEvent: React.KeyboardEvent<HTMLDivElement>): void => {
    if (keyboardEvent.key === "Escape") {
      keyboardEvent.preventDefault();
      onClose();
    }
  };
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    closeButtonReference.current?.focus();
  }, []);
  // endregion

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="채팅 앱 설치 안내"
      onKeyDown={onKeyDownDialog}
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
    >
      <section className="w-full rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl dark:bg-neutral-950 sm:max-w-sm sm:rounded-3xl sm:border sm:border-neutral-200 dark:sm:border-neutral-700">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">앱에서 채팅을 이용해 보세요</p>
            <p className="mt-1 text-xs text-neutral-500">회원가입 없는 공개 채팅입니다.</p>
          </div>
          <button
            ref={closeButtonReference}
            type="button"
            aria-label="설치 안내 닫기"
            onClick={onClickCloseButton}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-neutral-100 p-4 text-sm leading-6 dark:bg-neutral-900">
          {isIosBrowser ? (
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              <li>
                Safari 하단의 공유 버튼 <Share className="mx-1 inline" size={16} />을 누릅니다.
              </li>
              <li>‘홈 화면에 추가’를 선택해 설치합니다.</li>
              <li>설치 후 홈 화면의 온리 비트코인 아이콘으로 다시 실행합니다.</li>
            </ol>
          ) : (
            <ol className="flex list-decimal flex-col gap-2 pl-5">
              <li>아래 설치 버튼 또는 브라우저 메뉴에서 앱을 설치합니다.</li>
              <li>현재 탭을 닫고 홈 화면의 앱 아이콘으로 다시 실행합니다.</li>
              <li>앱의 채팅 버튼을 눌러 참여합니다.</li>
            </ol>
          )}
        </div>

        {deferredPrompt && !isIosBrowser && !hasRequestedInstall && (
          <button
            type="button"
            onClick={onClickInstallButton}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-bitcoin text-sm font-bold text-white"
          >
            <Download size={17} />앱 설치하기
          </button>
        )}
        {hasRequestedInstall && (
          <p className="mt-4 text-center text-xs leading-5 text-neutral-500">
            설치가 끝났다면 홈 화면 아이콘으로 다시 실행해 주세요. 현재 브라우저 탭에서는 채팅을
            열지 않습니다.
          </p>
        )}
      </section>
    </div>
  );
}
