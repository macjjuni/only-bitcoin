import { memo, useCallback, useEffect, useState } from "react";
import { KButton, KIcon } from "kku-ui";
import { isIOSPWA, isIOSSafari } from "@/shared/utils/device";
import IosShareIcon from "@/widgets/icon/IosShareIcon";
import "./PwaInstallAlarmIOS.scss";
import { usePwaInstall } from "@/shared/hooks";
import { getCookie } from "@/shared/utils/cookie";
import { PWA_COOKIE_KEY } from "@/shared/constants/setting";


const PwaInstallAlarmIOS = () => {


  // region [Hooks]

  const [isRender, setIsRender] = useState(false);
  const { onClickDisabled } = usePwaInstall();

  // endregion


  // region [Privates]

  const closeAlarm = useCallback(() => {
    setIsRender(false);
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

    const isCookie = getCookie(PWA_COOKIE_KEY);

    if (!isCookie) {
      setTimeout(() => { setIsRender(true); }, 300);
    }
  }, []);

  // endregion


  if (isIOSPWA() || !isIOSSafari()) {
    return null;
  }

  if (isRender) {
    return (
      <div className="pwa-install__alarm__ios">
        <KIcon icon="close" size={14} className="pwa-install__alarm__ios__close-button" onClick={closeAlarm} />
        <div className="pwa-install__alarm__ios__content">
          <span className="nowrap">공유(</span><IosShareIcon size={20} color="#4082E0" style={{ paddingBottom: "4px" }} />)
          아이콘을 누르고 <span className="bold">홈 화면에 추가</span>를 선택해 주세요.
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
