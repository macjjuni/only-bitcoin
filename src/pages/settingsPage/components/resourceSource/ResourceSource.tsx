import { memo } from "react";
import { KListRowAccordion } from "kku-ui";
import { DataIcon } from "@/components";
import "./ResourceSource.scss";


const ResourceSource = () => {

  return (

    <KListRowAccordion value="resource" label="리소스 출처" className="resource-source"
                       icon={<DataIcon size={22} style={{ margin: "0 3px" }} />}>
      <ul className="resource-source__list">
        {
          [
            { label: "BTC", value: "Upbit, Bithumb, Binance, Coinbase" },
            { label: "Dominance & Chart", value: "Coin Gecko" },
            { label: "Fear & Greed Index", value: "alternative.me" },
            { label: "USD/KRW Exchange Rate", value: "Naver(KEB)" }
          ].map(({ label, value }) => (
            <li key={label} className="resource-source__list__item">{label}: {value}</li>
          ))
        }
      </ul>
    </KListRowAccordion>
  );
};

export default memo(ResourceSource);