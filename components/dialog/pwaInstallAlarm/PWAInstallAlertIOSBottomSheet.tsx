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
        <KBottomSheetContent style={{ zIndex: 1000 }}>
          <KBottomSheetHeader>
            <KBottomSheetTitle>앱 설치 확인</KBottomSheetTitle>
          </KBottomSheetHeader>

          <div className="flex flex-row justify-center gap-6 items-center mt-4">
            <KIcon className="pwa-install__alarm__content__icon" icon="app" size={48} color="#1796EE"/>
            <div>
              <div className="flex">
                <span className="whitespace-pre-line">
                  <span className="inline-flex">
                    (<IosShareIcon size={32} color="#4082E0" style={{ paddingBottom: 4 }}/>)
                  </span> 공유 아이콘을 누르고
                  <span className="whitespace-nowrap font-bold underline">홈 화면에 추가</span>를 선택해 주세요.</span>
              </div>
            </div>
          </div>

          <KBottomSheetFooter>
            <KBottomSheetClose asChild>
              <KButton width="full" onClick={onClickClose}>오늘 하루 안보기</KButton>
            </KBottomSheetClose>
          </KBottomSheetFooter>
        </KBottomSheetContent>
      </KBottomSheet>
    )
  }

  return null
}