import { memo, useCallback, useEffect, useState } from "react";
import { KButton, KIcon, KSwitch } from "kku-ui";
import { FormRow } from "@/pages/settingsPage/components";
import { useInitializePWA } from "../../../../shared/hooks/initializer";
import { deleteCookie, getCookie, setCookie } from "@/shared/utils/cookie";
import { PWA_COOKIE_KEY } from "@/shared/constants/setting";
import { MessageIcon } from "@/components/icon";


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
      <FormRow icon={<MessageIcon size={24} />} label="앱 설치 메시지 숨기기">
        <KSwitch value={isInstallMsg} onChange={onChangeInstallMsg} />
      </FormRow>
      <FormRow icon={<KIcon icon="app" size={24} color="#1796EE" />} label="앱 설치">
        <KButton variant="primary" label="설치" onClick={onClickInstall} />
      </FormRow>
    </>
  );
};

export default memo(InstallSettingForm);
