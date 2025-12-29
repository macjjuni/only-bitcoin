import { useCallback, useMemo } from "react";
import { useOutletContext } from "react-router";
import { KIcon, KListGroup, KListRow, KSelect, KSwitch } from "kku-ui";
import { Moon, Star } from "lucide-react";
import router from "@/app/router";
import useStore from "@/shared/stores/store";
import InstallSettingForm from "./components/installSettingForm/InstallSettingForm";
import { PageLayout } from "@/layouts";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { currencyOptions, krwMarketOptions, usdMarketOptions } from "@/shared/constants/setting";
import { isSafari } from "@/shared/utils/device";
import { AnimationIcon, CurrencyIcon } from "@/components/ui/icon";
import { CurrencyTypes } from "@/shared/stores/store.interface";
import ResourceSource from "@/pages/settingsPage/components/resource-list-row/ResourceListRow";


export default function SettingsPage() {

  // region [Hooks]
  usePageAnimation(useOutletContext<UsePageAnimation>());
  const initialPath = useStore(state => state.setting.initialPath);
  const setInitialPath = useStore(state => state.setInitialPath);

  const currency = useStore(state => state.setting.currency);
  const setCurrency = useStore(state => state.setCurrency);

  const krwMarket = useStore(state => state.krwMarket);
  const setKrwMarket = useStore(state => state.setKrwMarket);

  const usdMarket = useStore(state => state.usdMarket);
  const setUsdMarket = useStore(state => state.setUsdMarket);

  const isUsdtStandard = useStore(state => state.setting.isUsdtStandard);
  const setUsdtStandard = useStore(state => state.setUsdtStandard);

  const isCountUp = useStore(state => state.setting.isCountUp);
  const setIsCountUp = useStore(state => state.setIsCountUp);

  const isBackgroundImg = useStore(state => state.setting.isBackgroundImg);
  const setIsBackgroundImg = useStore(state => state.setIsBackgroundImg);

  const isDark = useStore(state => state.theme) === "dark";
  const setTheme = useStore(state => state.setTheme);

  const deferredPrompt = useStore(state => state.setting.deferredPrompt);
  // endregion

  // region [Privates]
  const onRouteToFeedback = useCallback(() => {
    const anchorTag = document.createElement("a");
    anchorTag.href = import.meta.env.VITE_FEEDBACK_URL;
    anchorTag.target = "_blank";
    anchorTag.click();
    anchorTag.remove();
  }, []);
  // endregion

  // region [memo]
  const favoriteRouteOptions = useMemo(() => {
    return router.favoriteRouteList.map(route => ({ label: route.title, value: route.path }));
  }, []);
  // endregion


  return (
    <PageLayout className="pt-0.5">
      <div className="settings-page__area__form__area">
        {/* 가격 설정 그룹 */}
        <KListGroup header="가격 설정">
          <KListRow icon={<Star className="text-bitcoin" />} label="시작 페이지"
                    rightElement={<KSelect value={initialPath} options={favoriteRouteOptions} width="sm"
                                           onChange={setInitialPath} />} />
          <KListRow icon={<CurrencyIcon size={24} />} label="통화 단위"
                    rightElement={<KSelect value={currency} options={currencyOptions} width="xs"
                                           onChange={(v) => setCurrency(v as CurrencyTypes)} />} />
          <KListRow icon={<KIcon icon="won" size={28} color="#F2C84B" />} label="국내거래소"
                    rightElement={<KSelect value={krwMarket} options={krwMarketOptions} width="xs"
                                           onChange={setKrwMarket} />} />
          <KListRow icon={<KIcon icon="dollar" size={28} color="#85BB65" />} label="해외거래소"
                    rightElement={<KSelect value={usdMarket} options={usdMarketOptions} width="xs"
                                           onChange={setUsdMarket} />} />
          <KListRow icon={<KIcon icon="tether" size={24} />} label="USDT 기준 환율"
                    rightElement={<KSwitch checked={isUsdtStandard} onCheckedChange={setUsdtStandard} />} />
        </KListGroup>

        {/* 스타일 및 화면 설정 그룹 */}
        <KListGroup header="스타일 및 화면 설정">
          <KListRow icon={<Moon />} label="다크모드"
                    rightElement={<KSwitch checked={isDark}
                                           onCheckedChange={(val) => setTheme(val ? "dark" : "light")} />} />
          <KListRow icon={<KIcon icon="bitcoin_square" size={24} color="currentColor" />} label="배경 이미지"
                    rightElement={<KSwitch checked={isBackgroundImg} onCheckedChange={setIsBackgroundImg} />} />
          <KListRow icon={<AnimationIcon size={24} />} label="카운트 업 애니메이션"
                    rightElement={<KSwitch checked={isCountUp} onCheckedChange={setIsCountUp} />}
          />
        </KListGroup>

        {/* 설치 설정 (PWA) */}
        {!isSafari() && deferredPrompt?.userChoice && (<InstallSettingForm />)}

        {/* 정보 및 기타 그룹 */}
        <KListGroup header="정보">
          <KListRow icon={<KIcon icon="x_logo" size={24} />} label="피드백" onClick={onRouteToFeedback} />
          <ResourceSource />
          <KListRow icon={<KIcon icon="dev" color="#333" size={24} />} label="버전 정보"
                    rightElement={<span
                      className="text-[17px] text-muted-foreground">{import.meta.env.VITE_VERSION || "-"}</span>} />
        </KListGroup>
      </div>
    </PageLayout>
  );
}
