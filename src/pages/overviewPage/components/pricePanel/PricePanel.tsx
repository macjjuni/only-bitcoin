import { memo, useMemo } from "react";
import useStore from "@/shared/stores/store";
import { CountText, UpdownIcon } from "@/components";

const PricePanel = () => {
  const bitcoinPrice = useStore(state => state.bitcoinPrice);
  const currency = useStore(state => state.setting.currency);

  const Currencies = useMemo(() => [
    { code: 'KRW', sign: '₩', price: Number(bitcoinPrice.krw), percent: Number(bitcoinPrice.krwChange24h), signSize: 'text-[26px]' },
    { code: 'USD', sign: '$', price: Number(bitcoinPrice.usd), percent: Number(bitcoinPrice.usdChange24h), signSize: 'text-[28px]' },
  ],[bitcoinPrice]);

  return (
    <div className="flex flex-col gap-2 px-2">
      <div className="flex flex-col gap-0.5 items-start">
        {
          Currencies
            .filter(({ code }) => currency.includes(code))
            .map(({ code, sign, price, percent, signSize }) => (
              <div key={code} className="flex justify-between items-center w-full font-bold whitespace-nowrap overflow-hidden text-xl font-number">

                <div className="flex justify-start items-center">
                <span className={`flex justify-center content-center w-6 ${signSize}`}>{sign}</span>
                  <CountText value={price} className="text-3xl" />
                </div>

                <div className="flex justify-center items-center gap-1 text-sm">
                  <UpdownIcon isUp={percent > 0} />
                  <span className="w-[60px] text-right">
                  {percent > 0 && '+'}
                    <CountText value={percent} decimals={2} />%
                </span>
                </div>

              </div>
            ))
        }
      </div>
    </div>
  );
};

const MemoizedPricePanel = memo(PricePanel);
MemoizedPricePanel.displayName = 'PricePanel';

export default MemoizedPricePanel;