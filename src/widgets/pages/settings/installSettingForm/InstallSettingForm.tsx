import { memo, useCallback, useState } from "react";
import { KButton, KIcon, KSwitch } from "kku-ui";
import { FormRow } from "@/widgets";
import { usePwaInstall } from "@/shared/hooks";
import { deleteCookie, setCookie } from "@/shared/utils/cookie";
import { PWA_COOKIE_KEY } from "@/shared/constants/setting";


const InstallSettingForm = () => {


  // region [Hooks]

  const [isInstallMsg, setIsInstallMsg] = useState(false);
  const { onClickInstall } = usePwaInstall();

  // endregion


  // region [Events]

  const onChangeInstallMsg = useCallback((value: boolean) => {

    if (value) {
      setCookie(PWA_COOKIE_KEY, '_', 365);
    } else {
      deleteCookie(PWA_COOKIE_KEY);
    }
    setIsInstallMsg(value);
  }, [])

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
