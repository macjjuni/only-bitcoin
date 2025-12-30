import { memo, useCallback, useEffect, useState } from "react";
import { KIcon, KListGroup, KListRow, KSwitch } from "kku-ui";
import { MessageSquareWarning } from "lucide-react";
import { useInitializePWA } from "@/shared/hooks/initializer";
import { deleteCookie, getCookie, setCookie } from "@/shared/utils/cookie";
import { PWA_COOKIE_KEY } from "@/shared/constants/setting";


const InstallListRowGroup = () => {

  // region [Hooks]
  const [isInstallMsg, setIsInstallMsg] = useState(false);
  const { onClickInstall } = useInitializePWA();
  // endregion


  // region [Privates]
  const initializeInstallMsg = useCallback(() => {
    setIsInstallMsg(!!getCookie(PWA_COOKIE_KEY));
  }, []);
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
  useEffect(initializeInstallMsg, []);
  // endregion


  return (
    <KListGroup header="앱 설치">
      <KListRow icon={<MessageSquareWarning color="#1796EE" />} label="앱 설치 메시지 숨기기"
                rightElement={<KSwitch checked={isInstallMsg} onCheckedChange={onChangeInstallMsg} />} />
      <KListRow icon={<KIcon icon="app" size={24} color="#1796EE" />} label="앱 설치" onClick={onClickInstall} />
    </KListGroup>
  );
};

const MemoizedInstallListRowGroup = memo(InstallListRowGroup);
MemoizedInstallListRowGroup.displayName = "InstallListRowGroup";

export default MemoizedInstallListRowGroup;
