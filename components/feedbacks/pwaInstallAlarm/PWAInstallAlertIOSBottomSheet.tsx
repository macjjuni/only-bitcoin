'use client'

import { useState } from 'react'
import {
  KBottomSheet,
  KBottomSheetClose,
  KBottomSheetContent,
  KBottomSheetFooter,
  KBottomSheetHeader,
  KBottomSheetTitle,
  KBottomSheetOverlay,
  KButton,
  KIcon,
} from 'kku-ui'
import { setCookie } from '@/shared/utils/cookie'
import { PWA_COOKIE_KEY } from '@/shared/constants/setting'
import { IosShareIcon } from '@/components/ui/icon'
import { useInitializePWA } from '@/shared/hooks/initializer'

export default function PWAInstallAlertIOSBottomSheet() {

  // region [Hooks]
  // 렌더링 시 자동으로 열림
  const [open, setOpen] = useState(true)
  const { onClickDisabled } = useInitializePWA()
  // endregion


  // region [Events]
  const onClickClose = () => {
    setCookie(PWA_COOKIE_KEY, 'true', 1)
    setOpen(false)
    onClickDisabled()
  }
  // endregion


  return (
    <KBottomSheet open={open} onOpenChange={setOpen}>
      <KBottomSheetOverlay />
      <KBottomSheetContent className="border-border z-[51]">
        <KBottomSheetHeader>
          <KBottomSheetTitle>앱 설치 확인</KBottomSheetTitle>
        </KBottomSheetHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-row items-center gap-5">
            <KIcon icon="app" size={48} color="#1796EE"/>
            <p className="flex-1 text-md leading-tight font-medium break-keep">
              앱으로 설치하여 홈 화면에서 더 빠르고 편리하게 이용해 보세요.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-neutral-800 rounded-xl px-3 pt-4 pb-5 flex flex-col gap-3 text-[14px]">
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600 mt-1">1.</span>
              <div className="flex-1 leading-6">
                하단의 <strong>공유 버튼</strong>
                <span className="inline-block align-middle mx-1 -translate-y-[2px]">
                  <IosShareIcon size={22} color="#4082E0" />
                </span>
                을 클릭해 주세요.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-blue-600">2.</span>
              <p>메뉴에서 <strong>'홈 화면에 추가'</strong>를 선택해 주세요.</p>
            </div>
          </div>

          <p className="text-xs text-center text-gray-500">
            * 설정 탭에서 언제든 다시 설치 안내를 볼 수 있습니다.
          </p>
        </div>

        <KBottomSheetFooter>
          <KBottomSheetClose asChild>
            <KButton variant="ghost" size="lg" width="full" onClick={onClickClose}>
              오늘 하루 안보기
            </KButton>
          </KBottomSheetClose>
        </KBottomSheetFooter>
      </KBottomSheetContent>
    </KBottomSheet>
  )
}