import { memo } from "react";
import FormRowAccordion from "../formRowAccordion/FormRowAccordion";
import { DataIcon } from "@/components/icon";
import "./ResourceSource.scss";


const ResourceSource = () => {

  return (
    <FormRowAccordion label="리소스 출처" icon={<DataIcon size={22} style={{ margin: '0 3px' }} />} className="resource-source">
      <ul className="resource-source__list">
        {
          [
            { label: "BTC", value: "Upbit, Bithumb, Binance" },
            { label: "Dominance & Chart", value: "Coin Gecko" },
            { label: "Fear & Greed Index", value: "alternative.me" },
            { label: "USD/KRW Exchange Rate", value: "Naver(KEB)" }
          ].map(({ label, value }) => (
            <li key={label} className="resource-source__list__item">{label}: {value}</li>
          ))
        }
      </ul>
    </FormRowAccordion>
  );
};

export default memo(ResourceSource);
