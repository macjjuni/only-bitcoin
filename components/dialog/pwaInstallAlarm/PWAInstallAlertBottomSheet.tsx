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
    <KBottomSheet open={open} onOpenChange={setOpen}>
      <KBottomSheetContent style={{ zIndex: 1000 }}>
        <KBottomSheetHeader>
          <KBottomSheetTitle>앱 설치 확인</KBottomSheetTitle>
        </KBottomSheetHeader>

        <div className="flex flex-row justify-center gap-6">
          <KIcon className="pwa-install__alarm__content__icon" icon="app" size={48} color="#1796EE"/>
          <p className="flex items-center">앱을 설치하시겠습니까? 설정 탭에서 언제든 다시 설치할 수 있습니다.</p>
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