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
import { isIOSPWA, isIOSSafari } from '@/shared/utils/device'
import { getCookie } from '@/shared/utils/cookie'
import { PWA_COOKIE_KEY } from '@/shared/constants/setting'
import { IosShareIcon } from '@/components/ui/icon'
import { useInitializePWA } from '@/shared/hooks/initializer'
import { useMounted } from '@/shared/hooks'


export default function PWAInstallAlertIOSBottomSheet() {

  // region [Hooks]
  const isMount = useMounted();
  const [open, setOpen] = useState(false)
  const { onClickDisabled } = useInitializePWA()
  // endregion


  // region [Privates]
  const initializeRender = () => {

    const isCookie = getCookie(PWA_COOKIE_KEY)

    if (!isCookie) {
      setTimeout(() => {
        setOpen(true)
      }, 300)
    }
  }

  const closeAlarm = () => {
    setOpen(false)
  }
  // endregion


  // region [Events]
  const onClickClose = () => {
    closeAlarm()
    onClickDisabled()
  }
  // endregion


  // region [Life Cycles]
  useEffect(initializeRender, [])
  // endregion


  if (!isMount) {
    return null;
  }

  if (isIOSPWA() || !isIOSSafari()) {
    return null
  }

  if (open) {
    return (
      <KBottomSheet open={open} onOpenChange={setOpen}>
        <KBottomSheetContent style={{ zIndex: 1000 }} className="border-border">
          <KBottomSheetHeader>
            <KBottomSheetTitle>앱 설치 확인</KBottomSheetTitle>
          </KBottomSheetHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-row items-center gap-5">
              <KIcon icon="app" size={48} color="#1796EE"/>
              <p className="flex-1 text-[15px] leading-tight font-medium break-keep">
                앱으로 설치하여 홈 화면에서 더 빠르고 편리하게 이용해 보세요.
              </p>
            </div>

            {/* 단계별 설명 가이드 */}
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
                <p>메뉴에서 <strong>&#39;홈 화면에 추가&#39;</strong>를 선택해 주세요.</p>
              </div>
            </div>

            <p className="text-xs text-center text-gray-400">
              * 설정 탭에서 언제든 다시 설치 안내를 볼 수 있습니다.
            </p>
          </div>

          <KBottomSheetFooter>
            <KBottomSheetClose asChild>
              <KButton variant="ghost" width="full" onClick={onClickClose}>오늘 하루 안보기</KButton>
            </KBottomSheetClose>
          </KBottomSheetFooter>
        </KBottomSheetContent>
      </KBottomSheet>
    )
  }

  return null
}