"use client";

import { KIcon, KListGroup, KListRow, KSelect, KSwitch } from "kku-ui";
import { Star } from "lucide-react";
import { memo, useMemo } from "react";
import { useBitcoinStore } from "@/entities/bitcoin";
import { krwMarketOptions, usdMarketOptions } from "@/entities/market";
import { favoriteRouteList } from "@/shared/config/route";
import { currencyOptions } from "@/shared/constants/setting";
import useSettingStore from "@/shared/stores/settingStore";
import type { CurrencyTypes } from "@/shared/stores/slices/settingSlice";
import { CurrencyIcon } from "@/shared/ui";

const PriceListRowGroup = () => {
  // region [Hooks]
  const initialPath = useSettingStore((state) => state.setting.initialPath);
  const setInitialPath = useSettingStore((state) => state.setInitialPath);

  const currency = useSettingStore((state) => state.setting.currency);
  const setCurrency = useSettingStore((state) => state.setCurrency);

  const krwMarket = useBitcoinStore((state) => state.krwMarket);
  const setKrwMarket = useBitcoinStore((state) => state.setKrwMarket);

  const usdMarket = useBitcoinStore((state) => state.usdMarket);
  const setUsdMarket = useBitcoinStore((state) => state.setUsdMarket);

  const isUsdtStandard = useSettingStore((state) => state.setting.isUsdtStandard);
  const setUsdtStandard = useSettingStore((state) => state.setUsdtStandard);
  // endregion

  // region [memo]
  const favoriteRouteOptions = useMemo(
    () => favoriteRouteList.map((route) => ({ label: route.title, value: route.path })),
    [],
  );
  // endregion

  return (
    <KListGroup header="가격 설정">
      <KListRow
        icon={<Star className="text-bitcoin" />}
        label="시작 페이지"
        rightElement={
          <KSelect
            value={initialPath}
            options={favoriteRouteOptions}
            width="sm"
            onChange={setInitialPath}
          />
        }
      />
      <KListRow
        icon={<CurrencyIcon size={24} />}
        label="통화 단위"
        rightElement={
          <KSelect
            value={currency}
            options={currencyOptions}
            width="xs"
            onChange={(v) => setCurrency(v as CurrencyTypes)}
          />
        }
      />
      <KListRow
        icon={<KIcon icon="won" size={28} color="#F2C84B" />}
        label="국내거래소"
        rightElement={
          <KSelect
            value={krwMarket}
            options={krwMarketOptions}
            width="xs"
            onChange={setKrwMarket}
          />
        }
      />
      <KListRow
        icon={<KIcon icon="dollar" size={28} color="#85BB65" />}
        label="해외거래소"
        rightElement={
          <KSelect
            value={usdMarket}
            options={usdMarketOptions}
            width="xs"
            onChange={setUsdMarket}
          />
        }
      />
      <KListRow
        icon={<KIcon icon="tether" size={24} />}
        label="USDT 기준 환율"
        rightElement={<KSwitch checked={isUsdtStandard} onCheckedChange={setUsdtStandard} />}
      />
    </KListGroup>
  );
};

const MemoizedPriceListRowGroup = memo(PriceListRowGroup);
MemoizedPriceListRowGroup.displayName = "PriceListRowGroup";

export default MemoizedPriceListRowGroup;
