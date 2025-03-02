import { memo, useCallback, useEffect, useState } from "react";
import { KButton, KIcon, KSwitch } from "kku-ui";
import { FormRow } from "@/widgets/pages/settings";
import { useInitializePWA } from "../../../../shared/hooks/initializer";
import { deleteCookie, getCookie, setCookie } from "@/shared/utils/cookie";
import { PWA_COOKIE_KEY } from "@/shared/constants/setting";


const InstallSettingForm = () => {

  // region [Hooks]

  const [isInstallMsg, setIsInstallMsg] = useState(false);
  const { onClickInstall } = useInitializePWA();

  // endregion


  // region [Privates]

  const initializeInstallMsg = useCallback(() => {
    setIsInstallMsg(!!getCookie(PWA_COOKIE_KEY));
  }, [])

  // endregion


  // region [Events]

  const onChangeInstallMsg = useCallback((value: boolean) => {

    if (value) {
      setCookie(PWA_COOKIE_KEY, "_", 365);
    } else {
      deleteCookie(PWA_COOKIE_KEY);
    }
    setIsInstallMsg(value);
  }, []);

  // endregion


  // region [Life Cycles]

  useEffect(() => {
    initializeInstallMsg();
  }, []);

  // endregion


  return (
    <>
      <FormRow icon={<KIcon icon="app" size={24} color="#fff" />} label="앱 설치">
        <KButton label="설치" onClick={onClickInstall} />
      </FormRow>
      <FormRow icon={<KIcon icon="app" size={24} color="#fff" />} label="앱 설치 메시지 숨기기">
        <KSwitch value={isInstallMsg} onChange={onChangeInstallMsg} />
      </FormRow>
    </>
  );
};

export default memo(InstallSettingForm);
