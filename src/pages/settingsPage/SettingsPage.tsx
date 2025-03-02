import { useCallback, useMemo } from "react";
import { KButton, KIcon, KSelect, KSwitch } from "kku-ui";
import { NotKeyNotYourBitcoin } from "@/widgets";
import { btcColor } from "@/shared/constants/color";
import router from "@/app/router";
import useStore from "@/shared/stores/store";
import { currencyOptions } from "@/shared/constants/setting";
import { isSafari } from "@/shared/utils/device";
import { FormRow, InstallSettingForm, ResourceSource } from "@/widgets/pages/settings";
import "./SettingsPage.scss";
import AnimationIcon from "@/widgets/icon/AnimationIcon";


export default function SettingsPage() {


  // region [Hooks]

  const initialPath = useStore(state => state.setting.initialPath);
  const setInitialPath = useStore(state => state.setInitialPath);

  const currency = useStore(state => state.setting.currency);
  const setCurrency = useStore(state => state.setCurrency);

  const isUsdtStandard = useStore(state => state.setting.isUsdtStandard);
  const setUsdtStandard = useStore(state => state.setUsdtStandard);

  const isCountUp = useStore(state => state.setting.isCountUp);
  const setIsCountUp = useStore(state => state.setIsCountUp);

  const isBackgroundImg = useStore(state => state.setting.isBackgroundImg);
  const setIsBackgroundImg = useStore(state => state.setIsBackgroundImg);

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
    return router.favoriteRouteList.map(route => ({ title: `${route.title} 페이지`, value: route.path }));
  }, []);

  // endregion


  return (
    <div className="settings-page__area">
      <div className="settings-page__area__form__area">
        <FormRow icon={<KIcon icon="star" color={btcColor} />} label="시작 페이지">
          <KSelect value={initialPath} width="176px" onChange={(path) => {
            setInitialPath(path);
          }} items={favoriteRouteOptions} />
        </FormRow>

        <FormRow icon={<KIcon icon="currency" color="#FFD700" size={24} />} label="통화 단위">
          <div className="settings-page__area__currency__button-group">
            {
              currencyOptions.map(item => (
                <KButton key={item.value} label={item.text} onClick={() => setCurrency(item.value)}
                         className={currency === item.value ? "currency-active" : ""} />
              ))
            }
          </div>
        </FormRow>

        <FormRow icon={<KIcon icon="tether" size={24} />} label="USDT 기준 환율 적용">
          <KSwitch value={isUsdtStandard} onChange={(e) => {
            setUsdtStandard(e);
          }} />
        </FormRow>

        <FormRow icon={<AnimationIcon size={24} color="#c2c2c2" />} label="카운트 업 애니메이션">
          <KSwitch value={isCountUp} onChange={(e) => {
            setIsCountUp(e);
          }} />
        </FormRow>

        <FormRow icon={<KIcon icon="bitcoin_square" size={24} />} label="배경 이미지">
          <KSwitch value={isBackgroundImg} onChange={(e) => {
            setIsBackgroundImg(e);
          }} />
        </FormRow>

        {!isSafari() && deferredPrompt?.userChoice && <InstallSettingForm />}

        <FormRow icon={<KIcon icon="x_logo" size={24} />} label="피드백">
          <KButton label="이동" onClick={onRouteToFeedback} />
        </FormRow>

        <ResourceSource />

        <FormRow icon={<KIcon icon="dev" color="#333" size={24} />} label="버전 정보">
          {import.meta.env.VITE_VERSION || '-'}
        </FormRow>

      </div>
      <NotKeyNotYourBitcoin />
    </div>
  );
}
