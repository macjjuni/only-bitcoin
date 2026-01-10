'use client'

import { useEffect, useState } from 'react'
import {
  KBottomSheet,
  KBottomSheetClose,
  KBottomSheetContent,
  KBottomSheetFooter,
  KBottomSheetHeader,
  KBottomSheetTitle,
  KButton,
  KIcon,
} from 'kku-ui'
import { getCookie } from '@/shared/utils/cookie'
import { PWA_COOKIE_KEY } from '@/shared/constants/setting'
import { useInitializePWA } from '@/shared/hooks/initializer'


export default function PWAInstallAlertBottomSheet() {

  // region [Hooks]
  const [open, setOpen] = useState(false)
  const { deferredPrompt, onClickInstall, onClickDisabled } = useInitializePWA()
  // endregion


  // region [Privates]
  const initializeRender = () => {

    if (deferredPrompt?.userChoice && !getCookie(PWA_COOKIE_KEY)) {
      setOpen(true)
    }
  }

  const hideRender = () => {
    setOpen(false)
  }
  // endregion


  // region [Events]
  const onClickClose = () => {
    hideRender()
    onClickDisabled()
  }
  // endregion


  // region [Life Cycles]
  useEffect(initializeRender, [deferredPrompt])
  // endregion

  if (!open) {
    return null
  }

  return (
    <KBottomSheet open={open} onOpenChange={setOpen} size="sm">
      <KBottomSheetContent style={{ zIndex: 1000 }} className="border-border">
        <KBottomSheetHeader>
          <KBottomSheetTitle>앱 설치 확인</KBottomSheetTitle>
        </KBottomSheetHeader>

        <div className="flex flex-col gap-4">
          {/* 상단 아이콘 및 설명 */}
          <div className="flex flex-row items-center gap-5">
            <KIcon icon="app" size={48} color="#1796EE" />
            <p className="flex-1 text-[15px] leading-tight font-medium break-keep text-gray-800">
              앱으로 설치하여 홈 화면에서 더 빠르고 편리하게 이용해 보세요.
            </p>
          </div>

          {/* 안드로이드 가이드 영역 */}
          <div className="bg-gray-50 rounded-xl px-3 py-4 flex flex-col gap-4 text-[14px] text-gray-700">
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 mt-0.5">1.</span>
              <p className="flex-1 leading-6">
                아래 <strong>&#39;설치&#39;</strong> 버튼을 클릭해 주세요.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 mt-0.5">2.</span>
              <p className="flex-1 leading-6">
                브라우저 팝업창에서 <strong>&#39;설치&#39;</strong> 또는 <strong>&#39;추가&#39;</strong>를 선택하면 완료됩니다.
              </p>
            </div>
          </div>

          <p className="text-xs text-center text-gray-400 font-normal">
            * 설정 탭에서 언제든 다시 설치할 수 있습니다.
          </p>
        </div>

        <KBottomSheetFooter>
          <KButton variant="primary" width="full" onClick={onClickInstall}>설치</KButton>
          <KBottomSheetClose asChild>
            <KButton variant="ghost" width="full" onClick={onClickClose}>오늘 하루 안보기</KButton>
          </KBottomSheetClose>
        </KBottomSheetFooter>
      </KBottomSheetContent>
    </KBottomSheet>
  )
};