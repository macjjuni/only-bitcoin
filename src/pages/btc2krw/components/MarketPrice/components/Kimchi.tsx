import { useCallback, useMemo, useLayoutEffect, useState, memo } from "react";
import { Box } from "@mui/material";
import { TbSquareRoundedLetterK } from "react-icons/tb";
import PopOver from "@/pages/btc2krw/components/MarketPrice/components/PopOver";
import CountText from "../../../../../components/atom/countText/countText";
import { bearStore } from "@/store";

import { calcPerDiff } from "@/utils/common";
import getUsdExchangeRate from "@/api/exchangeRate";
import { type ExRateProps, type BtcProps } from "@/store/store.interface";

interface KimchiProps {
  btc: BtcProps;
  exRate: ExRateProps;
  isAnime: boolean;
}

const Kimchi = ({ btc, exRate, isAnime }: KimchiProps) => {
  // region [Hooks]

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const handlePopoverOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  // endregion

  // region [Transactions]

  const getFetchExRate = useCallback(() => {
    getUsdExchangeRate().then((resExRate) => {
      bearStore.setExRate(resExRate);
    });
  }, []);

  // endregion

  // region [Events]
  const handlePopoverClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // endregion

  // region [Life Cycles]

  useLayoutEffect(() => {
    getFetchExRate();
  }, []);

  // endregion

  // region [Privates]

  const KIcon = useMemo(() => <TbSquareRoundedLetterK fontSize={22} />, []);

  // endregion

  if (exRate.basePrice === 0) {
    console.error("환율 데이터 에러");
    return null;
  }

  return (
    <>
      <Box
        position="absolute"
        top="-32px"
        right="0"
        display="flex"
        flexDirection="row"
        justifyContent="flex-end"
        alignItems="center"
        height={30}
        gap="4px"
        sx={{ cursor: "pointer" }}
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
      >
        {KIcon}
        <CountText text={calcPerDiff(btc.krw, btc.usd, exRate.basePrice)} className="price-txt-sm kimchi" duration={0.3} percent decimals={2} isAnime={isAnime} />
      </Box>
      <PopOver anchorEl={anchorEl} open={Boolean(anchorEl)} handlePopoverClose={handlePopoverClose} />
    </>
  );
};

export default memo(Kimchi);
