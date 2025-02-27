import { memo } from "react";
import { KIcon } from "kku-ui";
import { FormRowAccordion } from "@/widgets/pages/settings";
import "./ResourceSource.scss";


const ResourceSource = () => {

  return (
    <FormRowAccordion label="리소스 출처" icon={<KIcon icon="star" size={20} />} className="resource-source">
      <ul className="resource-source__list">
        {
          [
            { label: "BTC(KRW)", value: "Upbit" },
            { label: "BTC(USD)", value: "Binance" },
            { label: "Chart", value: "Coin Gecko" },
            { label: "BTC Dominance", value: "Coin Gecko" },
            { label: "Feer & Greed Index", value: "alternative.me" }
          ].map(({ label, value }) => (
            <li key={label} className="resource-source__list__item">{label}: {value}</li>
          ))
        }
      </ul>
    </FormRowAccordion>
  );
};

export default memo(ResourceSource);
