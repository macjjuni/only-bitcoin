import { memo } from "react";
import { KListRowAccordion } from "kku-ui";
import { DataIcon } from "@/components";


const ResourceListRow = () => (
  <KListRowAccordion value="resource" label="리소스 출처" className="resource-source"
                     icon={<DataIcon size={22}/>}>
    <ul>
      {
        [
          { label: "- BTC", value: "Upbit, Bithumb, Binance, Coinbase" },
          { label: "- Dominance & Chart", value: "Coin Gecko" },
          { label: "- Fear & Greed Index", value: "alternative.me" },
          { label: "- USD/KRW Exchange Rate", value: "Naver(KEB)" }
        ].map(({ label, value }) => (
          <li key={label} className="text-sm text-current tracking-tighter">{label}: {value}</li>
        ))
      }
    </ul>
  </KListRowAccordion>
)
export default memo(ResourceListRow);