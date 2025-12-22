import { useCallback, useMemo } from "react";
import { useOutletContext } from "react-router";
import { KButton, KIcon, KSelect, KSwitch } from "kku-ui";
import router from "@/app/router";
import useStore from "@/shared/stores/store";
import InstallSettingForm from "./components/installSettingForm/InstallSettingForm";
import { PageLayout } from "@/layouts";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { currencyOptions, krwMarketOptions, usdMarketOptions } from "@/shared/constants/setting";
import { isSafari } from "@/shared/utils/device";
import { AnimationIcon, CurrencyIcon } from "@/components/ui/icon";
import { FormRow } from "@/components";
import { CurrencyTypes } from "@/shared/stores/store.interface";
import ResourceSource from "./components/resourceSource/ResourceSource";
import "./SettingsPage.scss";


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
    <PageLayout className="settings-page__area">
      <div className="settings-page__area__form__area">
        <FormRow icon={<KIcon icon="star" color="#f7931a" />} label="시작 페이지">
          <KSelect value={initialPath} options={favoriteRouteOptions} width={144}
                   onChange={(path) => { setInitialPath(path as string); }} />
        </FormRow>

        <FormRow icon={<CurrencyIcon size={24} />} label="통화 단위">
          <div className="settings-page__area__currency__button-group">
            <KSelect value={currency} options={currencyOptions}  width={144}
                     onChange={(value) => {
                       setCurrency(value as CurrencyTypes);
                     }} />
          </div>
        </FormRow>

        <FormRow icon={<KIcon icon="dollar" size={24} />} label="국내거래소">
          <div className="settings-page__area__currency__button-group">
            <KSelect value={krwMarket} options={krwMarketOptions}  width={144}
                     onChange={(value) => {
                       setKrwMarket(value as CurrencyTypes);
                     }} />
          </div>
        </FormRow>

        <FormRow icon={<KIcon icon="won" size={24} />} label="해외거래소">
          <div className="settings-page__area__currency__button-group">
            <KSelect value={usdMarket} options={usdMarketOptions}  width={144}
                     onChange={(value) => {
                       setUsdMarket(value as CurrencyTypes);
                     }} />
          </div>
        </FormRow>

        <FormRow icon={<KIcon icon="tether" size={24} />} label="USDT 기준 환율">
          <KSwitch checked={isUsdtStandard} onCheckedChange={setUsdtStandard} />
        </FormRow>
      </div>


      <div className="settings-page__area__form__area">
        <FormRow icon={<KIcon icon="visibility" size={24} />} label="다크모드">
          <KSwitch checked={isDark} onCheckedChange={(val) => {
            setTheme(val ? "dark" : "light");
          }} />
        </FormRow>
        <FormRow icon={<KIcon icon="bitcoin_square" size={24} />} label="배경 이미지">
          <KSwitch checked={isBackgroundImg} onCheckedChange={setIsBackgroundImg} />
        </FormRow>
        <FormRow icon={<AnimationIcon size={24} color="#f7931a" />} label="카운트 업 애니메이션">
          <KSwitch checked={isCountUp} onCheckedChange={setIsCountUp} />
        </FormRow>
      </div>

      {!isSafari() && deferredPrompt?.userChoice &&
        <div className="settings-page__area__form__area">
          <InstallSettingForm />
        </div>
      }

      <div className="settings-page__area__form__area">
        <FormRow icon={<KIcon icon="x_logo" size={24} />} label="피드백">
          <KButton variant="primary" size="sm" onClick={onRouteToFeedback}>이동</KButton>
        </FormRow>
        <ResourceSource />
        <FormRow icon={<KIcon icon="dev" color="#333" size={24} />} label="버전 정보">
          {import.meta.env.VITE_VERSION || "-"}
        </FormRow>
      </div>
    </PageLayout>
  );
}
