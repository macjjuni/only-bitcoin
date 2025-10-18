import { useCallback, useMemo } from "react";
import { useOutletContext } from "react-router";
import { KButton, KIcon, KSelect, KSwitch } from "kku-ui";
import { btcColor } from "@/shared/constants/color";
import router from "@/app/router";
import useStore from "@/shared/stores/store";
import { PageLayout } from "@/layouts";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { currencyOptions, krwMarketOptions } from "@/shared/constants/setting";
import { isSafari } from "@/shared/utils/device";
import { AnimationIcon } from "@/components/icon";
import { CurrencyTypes } from "@/shared/stores/store.interface";
import { InstallSettingForm, FormRow } from "./components";
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
        <FormRow icon={<KIcon icon="star" color={btcColor} />} label="시작 페이지">
          <KSelect value={initialPath} items={favoriteRouteOptions} size="medium" width={142}
                   onChange={(path) => {
                     setInitialPath(path as string);
                   }} />
        </FormRow>

        <FormRow icon={<KIcon icon="currency" color="#FFD700" size={24} />} label="통화 단위">
          <div className="settings-page__area__currency__button-group">
            <KSelect value={currency} items={currencyOptions} size="medium" width={142}
                     onChange={(value) => {
                       setCurrency(value as CurrencyTypes);
                     }} />
          </div>
        </FormRow>

        <FormRow icon={<KIcon icon="won" size={24} />} label="국내거래소">
          <div className="settings-page__area__currency__button-group">
            <KSelect value={krwMarket} items={krwMarketOptions} size="medium" width={142}
                     onChange={(value) => {
                       setKrwMarket(value as CurrencyTypes);
                     }} />
          </div>
        </FormRow>

        {/* <FormRow icon={<KIcon icon="won" size={24} />} label="해외거래소(Dev)"> */}
        {/*   <div className="settings-page__area__currency__button-group"> */}
        {/*     <KSelect value={krwMarket} items={krwMarketOptions} size="medium" width={142} */}
        {/*              onChange={(value) => { */}
        {/*                setKrwMarket(value as CurrencyTypes); */}
        {/*              }} /> */}
        {/*   </div> */}
        {/* </FormRow> */}

        <FormRow icon={<KIcon icon="tether" size={24} />} label="USDT 기준 환율 적용">
          <KSwitch value={isUsdtStandard} onChange={(e) => {
            setUsdtStandard(e);
          }} />
        </FormRow>
      </div>


      <div className="settings-page__area__form__area">
        <FormRow icon={<KIcon icon="visibility" size={24} />} label="다크모드">
          <KSwitch value={isDark} onChange={(e) => {
            setTheme(e ? "dark" : "light");
          }} />
        </FormRow>
        <FormRow icon={<KIcon icon="bitcoin_square" size={24} />} label="배경 이미지">
          <KSwitch value={isBackgroundImg} onChange={(e) => {
            setIsBackgroundImg(e);
          }} />
        </FormRow>
        <FormRow icon={<AnimationIcon size={24} color="#c2c2c2" />} label="카운트 업 애니메이션">
          <KSwitch value={isCountUp} onChange={(e) => {
            setIsCountUp(e);
          }} />
        </FormRow>
      </div>

      {!isSafari() && deferredPrompt?.userChoice &&
        <div className="settings-page__area__form__area">
          <InstallSettingForm />
        </div>
      }

      <div className="settings-page__area__form__area">
        <FormRow icon={<KIcon icon="x_logo" size={24} />} label="피드백">
          <KButton variant="primary" label="이동" onClick={onRouteToFeedback} />
        </FormRow>
        {/* 리소스 출처 */}
        {/* <ResourceSource /> */}
        <FormRow icon={<KIcon icon="dev" color="#333" size={24} />} label="버전 정보">
          {import.meta.env.VITE_VERSION || "-"}
        </FormRow>
      </div>
    </PageLayout>
  );
}
