import { memo, useCallback, useEffect, useRef, useState } from "react";
import { KButton, KIcon } from "kku-ui";
import { isIOSPWA, isIOSSafari } from "@/shared/utils/device";
import { useInitializePWA } from "../../shared/hooks/initializer";
import { getCookie } from "@/shared/utils/cookie";
import { PWA_COOKIE_KEY } from "@/shared/constants/setting";
import IosShareIcon from "@/widgets/icon/IosShareIcon";
import "./PwaInstallAlarmIOS.scss";


const PwaInstallAlarmIOS = () => {


  // region [Hooks]

  const rootRef = useRef<HTMLDivElement>(null);
  const [isRender, setIsRender] = useState(false);
  const { onClickDisabled } = useInitializePWA();

  // endregion


  // region [Privates]

  const initializeRender = useCallback(() => {

    const isCookie = getCookie(PWA_COOKIE_KEY);

    if (!isCookie) {
      setTimeout(() => { setIsRender(true); }, 300);
    }
  }, []);

  const closeAlarm = useCallback(() => {
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
    closeAlarm();
    onClickDisabled();
  }, [onClickDisabled]);

  // endregion


  // region [Life Cycles]

  useEffect(() => {

    initializeRender();
  }, []);

  useEffect(() => {
    if (isRender) {
      window.addEventListener('click', observerAnotherClick)
    } else {
      window.removeEventListener('click', observerAnotherClick)
    }
  }, [isRender]);

  // endregion


  if (isIOSPWA() || !isIOSSafari()) {
    return null;
  }

  if (isRender) {
    return (
      <div ref={rootRef} className="pwa-install__alarm__ios">
        <KIcon icon="close" size={14} className="pwa-install__alarm__ios__close-button" onClick={closeAlarm} />
        <div className="pwa-install__alarm__ios__content">
          <span className="nowrap">공유(</span><IosShareIcon size={20} color="#4082E0" style={{ paddingBottom: "4px" }} />)
          아이콘을 누르고 <span className="bold underline">홈 화면에 추가</span>를 선택해 주세요.
        </div>

        <div className="pwa-install__alarm__ios__button__area">
          <KButton label="오늘 하루 안보기" size="small" onClick={onClickClose} />
        </div>
      </div>
    );
  }

  return null;
};

export default memo(PwaInstallAlarmIOS);
