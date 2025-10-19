import { memo, useCallback, useEffect, useRef, useState } from "react";
import { KButton, KIcon } from "kku-ui";
import { useInitializePWA } from "../../shared/hooks/initializer";
import { getCookie } from "@/shared/utils/cookie";
import { PWA_COOKIE_KEY } from "@/shared/constants/setting";
import "./PwaInstallAlarm.scss";


const PwaInstallAlarm = () => {


  // region [Hooks]

  const rootRef = useRef<HTMLDivElement>(null);
  const [isRender, setIsRender] = useState(false);
  const { deferredPrompt, onClickInstall, onClickDisabled } = useInitializePWA();

  // endregion


  // region [Privates]

  const initializeRender = useCallback(() => {

    if (deferredPrompt?.userChoice && !getCookie(PWA_COOKIE_KEY)) {
      setIsRender(true);
    }
  }, [deferredPrompt]);

  const hideRender = useCallback(() => {
    setIsRender(false);
  }, []);

  const observerAnotherClick = useCallback((e: UIEvent) => {
    if (rootRef.current && !rootRef.current.contains(e.target as HTMLElement)) {
      setIsRender(false);
    }
  }, []);

  // endregion


  // region [Events]

  const onClickClose = useCallback(() => {
    hideRender();
    onClickDisabled();
  }, [onClickDisabled]);

  // endregion


  // region [Life Cycles]

  useEffect(() => {
    initializeRender();
  }, [deferredPrompt]);

  useEffect(() => {
    if (isRender) {
      window.addEventListener('click', observerAnotherClick)
    } else {
      window.removeEventListener('click', observerAnotherClick)
    }
  }, [isRender]);

  // endregion

  if (!isRender) {
    return null;
  }

  return (
    <div ref={rootRef} className="pwa-install__alarm">
      <KIcon icon="close" size={14} className="pwa-install__alarm__close-button" onClick={() => { setIsRender(false); }} />
      <div className="pwa-install__alarm__content">
        <KIcon className="pwa-install__alarm__content__icon" icon="app" size={40} />
        앱을 설치하시겠습니까? 설정 탭에서 언제든 다시 설치할 수 있습니다.
      </div>

      <div className="pwa-install__alarm__button__area">
        <KButton variant="subtle" label="오늘 하루 안보기" size="small" onClick={onClickClose} />
        <KButton variant="primary" label="설치" size="small" onClick={onClickInstall} />
      </div>
    </div>
  );
};

export default memo(PwaInstallAlarm);
