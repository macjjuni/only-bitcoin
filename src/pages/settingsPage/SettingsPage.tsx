import "./SettingsPage.scss";
import { KSelect } from "kku-ui";
import { FormRow } from "@/widgets/settings/formRow/FormRow";
import { TetherIcon, StarIcon, CurrencyIcon } from "@/shared/icons";
import { btcColor } from "@/shared/constants/color";

export default function SettingsPage() {

  return (
    <div className="settings-page__area">

      <div className="settings-page__area__form__area">
        <FormRow icon={<StarIcon color={btcColor} />}>
           시작 페이지
          <KSelect size="small" value="" width="160px" onChange={() => {}} items={[{title: 'Test', value: '123'}]} />
        </FormRow>
        <FormRow icon={<TetherIcon size={24} />}>
          USDT 기준 환율 적용
        </FormRow>
        <FormRow icon={<CurrencyIcon size={24} color="#c2c2c2" />}>
          가격 단위
        </FormRow>
      </div>
    </div>
  );
}
