'use client';

import { memo, useMemo } from "react";
import { KIcon, KListGroup, KListRow, KSelect, KSwitch } from "kku-ui";
import { Star } from "lucide-react";
import { CurrencyIcon } from "@/components";
import { currencyOptions, krwMarketOptions, usdMarketOptions } from "@/shared/constants/setting";
import { CurrencyTypes } from "@/shared/stores/store.interface";
import { favoriteRouteList  } from '@/shared/constants/route';
import useStore from "@/shared/stores/store";


const PriceListRowGroup = () => {

  // region [Hooks]
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
  // endregion


  // region [Privates]

  // endregion

  // region [memo]
  const favoriteRouteOptions = useMemo(() => favoriteRouteList.map(route => ({ label: route.title, value: route.path })), []);
  // endregion

  return (
    <KListGroup header="가격 설정">
      <KListRow icon={<Star className="text-bitcoin" />} label="시작 페이지"
                rightElement={<KSelect value={initialPath} options={favoriteRouteOptions} width="sm"
                                       onChange={setInitialPath} />} />
      <KListRow icon={<CurrencyIcon size={24} />} label="통화 단위"
                rightElement={<KSelect value={currency} options={currencyOptions} width="xs"
                                       onChange={(v) => setCurrency(v as CurrencyTypes)} />} />
      <KListRow icon={<KIcon icon="won" size={28} color="#F2C84B" />} label="국내거래소"
                rightElement={<KSelect value={krwMarket} options={krwMarketOptions} width="xs"
                                       onChange={setKrwMarket} />} />
      <KListRow icon={<KIcon icon="dollar" size={28} color="#85BB65" />} label="해외거래소"
                rightElement={<KSelect value={usdMarket} options={usdMarketOptions} width="xs"
                                       onChange={setUsdMarket} />} />
      <KListRow icon={<KIcon icon="tether" size={24} />} label="USDT 기준 환율"
                rightElement={<KSwitch checked={isUsdtStandard} onCheckedChange={setUsdtStandard} />} />
    </KListGroup>
  );
};

const MemoizedPriceListRowGroup = memo(PriceListRowGroup);
MemoizedPriceListRowGroup.displayName = "PriceListRowGroup";

export default MemoizedPriceListRowGroup;
