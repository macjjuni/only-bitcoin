import { useMemo, ReactNode, memo } from "react";
import { Stack, Typography, useMediaQuery } from "@mui/material";
import { FaWonSign } from "react-icons/fa";
import { IoLogoUsd } from "react-icons/io";
import { TbSquareRoundedLetterK } from "react-icons/tb";
import { MdOutlinePercent } from "react-icons/md";
import CardItem from "@/components/molecule/CardItem";
import { useBearStore } from "@/store";
import { calcPerDiff } from "@/utils/common";
import { comma } from "@/utils/string";
import { responsive } from "@/styles/style";
import PageLayout from "@/layout/pageLayout/pageLayout";
import PageTitle from "@/components/atom/PageTitle/PageTitle";
import CountText from "@/components/atom/CountText/CountText";
import "./premium.scss";

const LabelElement = ({ children }: { children: ReactNode }) => {
  return <span style={{ width: "28px", height: "26px" }}>{children}</span>;
};
const MemoizedLabel = memo(LabelElement);

const PremiumPage = () => {
  const { krw, usd } = useBearStore((state) => state.btc);
  const { basePrice } = useBearStore((state) => state.exRate);

  const matches = useMediaQuery(`(min-width: ${responsive.mobile}px)`);

  const WonIcon = useMemo(
    () => (
      <MemoizedLabel>
        <FaWonSign fontSize={26} />
      </MemoizedLabel>
    ),
    []
  );

  const DollarIcon = useMemo(
    () => (
      <MemoizedLabel>
        <IoLogoUsd fontSize={27} style={{ marginRight: "-4px" }} />
      </MemoizedLabel>
    ),
    []
  );

  const koreaUsdPrice = useMemo(() => Number(krw / basePrice), [krw, basePrice]); // 한국 원화 가격
  const usaKrwPrice = useMemo(() => Number(usd * basePrice), [usd, basePrice]); // 해외 원화 가격
  const premiumKrw = useMemo(() => comma((krw - usaKrwPrice).toFixed(0)), [krw, usaKrwPrice]); // 원화 프리미엄 가격
  const premiumUsd = useMemo(() => comma((koreaUsdPrice - usd).toFixed(0)), [usd, koreaUsdPrice]); // 원화 프리미엄 가격

  const stackJustifyContent = useMemo(() => (matches ? "normal" : "flex-end"), [matches]);

  return (
    <PageLayout className="premium-page">
      <PageTitle title="한국 프리미엄" />
      <div className="premium-page__card-list">
        <CardItem
          title={
            <Stack flexDirection="row" alignItems="center" gap={1} mt={matches ? 0 : "4px"}>
              <TbSquareRoundedLetterK fontSize={24} />
              <Typography fontSize={18} fontWeight="bold">
                프리미엄
              </Typography>
            </Stack>
          }
          matches={matches}
          content={
            <Stack>
              <Stack direction="row" justifyContent={stackJustifyContent} alignItems="center" gap={1} fontSize={24} fontWeight="bold">
                {WonIcon}
                {premiumKrw}
              </Stack>
              <Stack direction="row" justifyContent={stackJustifyContent} alignItems="center" gap={1} fontSize={24} fontWeight="bold">
                {DollarIcon}
                {premiumUsd}
              </Stack>
              <Stack flexDirection="row" justifyContent={stackJustifyContent} alignItems="center" gap={1} fontSize={24} fontWeight="bold">
                <MdOutlinePercent size={28} />
                <Typography fontSize="inherit" fontWeight="inherit">
                  <CountText text={calcPerDiff(krw, usd, basePrice)} decimals={2} duration={0.2} isAnime />
                </Typography>
              </Stack>
            </Stack>
          }
          bottom={<></>}
        />
        <CardItem
          title={
            <Stack flexDirection="row" alignItems="center" gap={1} mt={matches ? 0 : "4px"}>
              <img src="https://raw.githubusercontent.com/macjjuni/only-bitcoin/refs/heads/main/public/images/upbit_logo.webp" alt="upbit_logo" width={24} height={24} />
              <Typography fontSize={18} fontWeight="bold">
                한국 시세
              </Typography>
            </Stack>
          }
          matches={matches}
          content={
            <Stack pb={1.5}>
              <Stack direction="row" justifyContent={stackJustifyContent} alignItems="center" gap={1} fontSize={24} fontWeight="bold">
                {WonIcon} {comma(krw.toString())}
              </Stack>
              <Stack direction="row" justifyContent={stackJustifyContent} alignItems="center" gap={1} fontSize={24} fontWeight="bold">
                {DollarIcon} {comma(koreaUsdPrice.toFixed(0))}
              </Stack>
            </Stack>
          }
          bottom={
            <Typography fontSize={16} fontWeight="bold">
              USD/KRW: {comma(basePrice.toString())}
            </Typography>
          }
        />
        <CardItem
          title={
            <Stack flexDirection="row" alignItems="center" gap={1} mt={matches ? 0 : "4px"}>
              <img src="https://raw.githubusercontent.com/macjjuni/only-bitcoin/refs/heads/main/public/images/binance_logo.webp" alt="binance_logo" width={24} height={24} />
              <Typography fontSize={18} fontWeight="bold">
                해외 시세
              </Typography>
            </Stack>
          }
          matches={matches}
          content={
            <Stack pb={1.5}>
              <Stack direction="row" justifyContent={stackJustifyContent} alignItems="center" gap={1} fontSize={24} fontWeight="bold">
                {WonIcon} {comma(usaKrwPrice.toFixed(0))}
              </Stack>
              <Stack direction="row" justifyContent={stackJustifyContent} alignItems="center" gap={1} fontSize={24} fontWeight="bold">
                {DollarIcon} {comma(usd.toFixed(0))}
              </Stack>
            </Stack>
          }
          bottom={
            <Typography fontSize={16} fontWeight="bold">
              USD/KRW: {comma(basePrice.toString())}
            </Typography>
          }
        />
      </div>
      {/* </Stack> */}
    </PageLayout>
  );
};

export default PremiumPage;
