'use client'

import { useEffect } from 'react'
import { setCookie } from '@/shared/utils/cookie'
import useStore from '@/shared/stores/store'
import { BeforeInstallPromptEvent } from '@/shared/stores/store.interface'
import { PWA_COOKIE_KEY } from '@/shared/constants/setting'


export default function useInitializePWA() {

  // region [Hooks]
  const deferredPrompt = useStore(state => state.setting.deferredPrompt)
  const setDeferredPrompt = useStore(state => state.setDeferredPrompt)
  // endregion


  // region [Privates]
  const initializeDeferredPrompt = (e: Event) => {
    e.preventDefault()
    setDeferredPrompt(e as BeforeInstallPromptEvent)
  }

  const initializePwaInstall = () => {
    window.addEventListener('beforeinstallprompt', initializeDeferredPrompt)
  }

  const clearPwaInstall = () => {
    window.removeEventListener('beforeinstallprompt', initializeDeferredPrompt)
  }

  const onNoRenderOneDay = () => {
    setCookie(PWA_COOKIE_KEY, '_', 1)
  }
  // endregion


  // region [Events]
  const onClickInstall = async () => {

    if (deferredPrompt) {
      await deferredPrompt.prompt()

      const choiceResult = await deferredPrompt.userChoice

      if (choiceResult?.outcome === 'accepted') {
        console.log('사용자가 PWA를 설치했습니다.')
      } else {
        clearPwaInstall()

        setTimeout(() => {
          initializePwaInstall()
        }, 0)
      }
    }
  }

  const onClickDisabled = onNoRenderOneDay
  // endregion


  // region [Life Cycles]
  useEffect(initializePwaInstall, [])
  // endregion


  return { deferredPrompt, onClickInstall, onClickDisabled }
}
