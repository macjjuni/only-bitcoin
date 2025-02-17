import "./SettingsPage.scss";
import { KButton, KSelect, KSwitch } from "kku-ui";
import { FormRow } from "@/widgets/settings/formRow/FormRow";
import { TetherIcon, StarIcon, CurrencyIcon } from "@/shared/icons";
import { btcColor } from "@/shared/constants/color";

export default function SettingsPage() {

  return (
    <div className="settings-page__area">

      <div className="settings-page__area__form__area">
        <FormRow icon={<StarIcon color={btcColor} />} label="시작 페이지">
          <KSelect size="small" value="" width="160px" onChange={() => {}} items={[{title: 'Test', value: '123'}]} />
        </FormRow>
        <FormRow icon={<TetherIcon size={24} />} label="USDT 기준 환율 적용">
          <KSwitch value onChange={() => {}}  />
        </FormRow>
        <FormRow icon={<CurrencyIcon size={24} color="#c2c2c2" />} label="통화 단위">
          <KButton label="KRW" size="small" />
          <KButton label="USD" size="small" />
          <KButton label="KRW/USD" size="small" />
        </FormRow>
      </div>
    </div>
  );
}
