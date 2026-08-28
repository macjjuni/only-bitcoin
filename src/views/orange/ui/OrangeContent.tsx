"use client";

import { KIcon } from "kku-ui";
import { HandCoins, TableProperties } from "lucide-react";
import { useTransitionRouter } from "next-view-transitions";
import { type ReactNode, useCallback, useMemo } from "react";
import { allRouteList } from "@/shared/config/route";
import {
  BanknoteIcon,
  BuildingIcon,
  CalendarIcon,
  DiscordIcon,
  EagleIcon,
  HalfCircleIcon,
  MinerIcon,
  NaverIcon,
  PageIcon,
  PageTitle,
  ShootingStarIcon,
  TreasuryIcon,
} from "@/shared/ui";
import { onRouteToExternalLink } from "@/shared/utils/common";

// region [Constants]
const ICON_CLASS = "text-orange-500 dark:text-orange-400";

/** 외부 링크. 라우팅이 아니라 새 탭으로 여는 주소라 route config 가 아닌 여기서 관리함. */
const EXTERNAL_LINKS = {
  CITADEL_DISCORD: "https://discord.gg/citadel21",
  CITADEL_CAFE: "https://cafe.naver.com/btcforever",
  ATOMIC_BTC_NOTION: "http://atomicbtc.kr",
  FIAT_GOV_BITCOIN_DOC: "https://finished-snake-h7zp8jm.gamma.site",
} as const;
// endregion

// region [Types]
interface UtilityCard {
  title: string;
  icon: ReactNode;
  onClick: () => void;
}
// endregion

const OrangeContent = () => {
  // region [Hooks]
  const router = useTransitionRouter();
  // endregion

  // region [Privates]
  const navigateToUtility = useCallback(
    (pathKeyword: string, utilityName: string) => {
      const routePath = allRouteList.find((item) => item.path.includes(pathKeyword))?.path;

      if (!routePath) {
        console.warn(`${utilityName} 경로를 찾을 수 없습니다.`);
        return;
      }

      router.push(routePath);
    },
    [router],
  );
  // endregion

  // region [Events]
  const onClickMemeUtility = useCallback(() => {
    navigateToUtility("meme", "Meme");
  }, [navigateToUtility]);

  const onClickDcaUtility = useCallback(() => {
    navigateToUtility("/dca", "DCA");
  }, [navigateToUtility]);

  const onClickBtc2ApartmentUtility = useCallback(() => {
    navigateToUtility("/btc2apartment", "아파트 몇 BTC?");
  }, [navigateToUtility]);

  const onClickCagrUtility = useCallback(() => {
    navigateToUtility("/cagr", "월별 등락률");
  }, [navigateToUtility]);

  const onClickWithdrawFeeUtility = useCallback(() => {
    navigateToUtility("/withdraw-fee", "거래소 출금 수수료");
  }, [navigateToUtility]);

  const onClickTreasuryUtility = useCallback(() => {
    navigateToUtility("/treasury", "기업 비트코인 트레저리");
  }, [navigateToUtility]);

  const onClickEtfUtility = useCallback(() => {
    navigateToUtility("/etf", "현물 ETF 현황");
  }, [navigateToUtility]);

  const onClickM2BtcUtility = useCallback(() => {
    navigateToUtility("/m2btc", "미국 M2와 비트코인");
  }, [navigateToUtility]);

  const onClickHalvingCountdownUtility = useCallback(() => {
    navigateToUtility("/countdown", "반감기 카운트다운");
  }, [navigateToUtility]);

  const onClickBIP39Utility = useCallback(() => {
    navigateToUtility("/bip39", "BIP39");
  }, [navigateToUtility]);

  const onClickCitadelDiscord = useCallback(() => {
    onRouteToExternalLink(EXTERNAL_LINKS.CITADEL_DISCORD);
  }, []);

  const onClickCitadelCafe = useCallback(() => {
    onRouteToExternalLink(EXTERNAL_LINKS.CITADEL_CAFE);
  }, []);

  const onClickAtomicNotion = useCallback(() => {
    onRouteToExternalLink(EXTERNAL_LINKS.ATOMIC_BTC_NOTION);
  }, []);

  const onClickFiatGovBitcoin = useCallback(() => {
    onRouteToExternalLink(EXTERNAL_LINKS.FIAT_GOV_BITCOIN_DOC);
  }, []);
  // endregion

  // region [Templates]
  const UtilityCardsTemplate: UtilityCard[] = useMemo(
    () => [
      {
        title: "M2·비트코인",
        icon: <BanknoteIcon size={28} className={ICON_CLASS} />,
        onClick: onClickM2BtcUtility,
      },
      {
        title: "현물 ETF 현황",
        icon: <EagleIcon size={28} className={ICON_CLASS} />,
        onClick: onClickEtfUtility,
      },
      {
        title: "트레저리",
        icon: <TreasuryIcon size={28} className={ICON_CLASS} />,
        onClick: onClickTreasuryUtility,
      },
      {
        title: "월별 등락률",
        icon: <CalendarIcon size={26} className={ICON_CLASS} />,
        onClick: onClickCagrUtility,
      },
      {
        title: "밈 저장소",
        icon: <ShootingStarIcon size={30} className={ICON_CLASS} />,
        onClick: onClickMemeUtility,
      },
      {
        title: "아파트 몇 BTC?",
        icon: <BuildingIcon size={28} className={ICON_CLASS} />,
        onClick: onClickBtc2ApartmentUtility,
      },
      {
        title: "반감기 카운트",
        icon: <HalfCircleIcon size={24} />,
        onClick: onClickHalvingCountdownUtility,
      },
      {
        title: "출금 수수료",
        icon: (
          <HandCoins
            size={28}
            strokeWidth={1.8}
            className="[&_circle]:stroke-orange-500 dark:[&_circle]:stroke-orange-400"
          />
        ),
        onClick: onClickWithdrawFeeUtility,
      },
      {
        title: "DCA 계산기",
        icon: <MinerIcon size={32} />,
        onClick: onClickDcaUtility,
      },
      {
        title: "BIP39",
        icon: <TableProperties size={26} strokeWidth={1.8} />,
        onClick: onClickBIP39Utility,
      },
    ],
    [
      onClickBIP39Utility,
      onClickBtc2ApartmentUtility,
      onClickCagrUtility,
      onClickDcaUtility,
      onClickEtfUtility,
      onClickHalvingCountdownUtility,
      onClickM2BtcUtility,
      onClickWithdrawFeeUtility,
      onClickMemeUtility,
      onClickTreasuryUtility,
    ],
  );

  const AcademyCardsTemplate = useMemo(
    () => [
      {
        title: "ATOMIC⚡️₿ITCOIN",
        icon: <KIcon icon="notion" size={22} />,
        onClick: onClickAtomicNotion,
      },
      {
        title: "화폐와 정부 & 비트코인",
        icon: <PageIcon size={22} />,
        onClick: onClickFiatGovBitcoin,
      },
    ],
    [onClickAtomicNotion, onClickFiatGovBitcoin],
  );

  const CommunityCardsTemplate = useMemo(
    () => [
      {
        title: "CITADEL",
        icon: <DiscordIcon size={22} />,
        onClick: onClickCitadelDiscord,
      },
      {
        title: "지분전쟁: 시타델",
        icon: <NaverIcon size={22} />,
        onClick: onClickCitadelCafe,
      },
    ],
    [onClickCitadelCafe, onClickCitadelDiscord],
  );
  // endregion

  return (
    <>
      <section aria-label="서비스">
        <PageTitle
          label="Orange"
          title="오렌지 서비스"
          description="비트코인을 더 깊게 파고들 수 있도록 재밌는 서비스들을 모아봤습니다."
        />

        <div className="grid grid-cols-4 overflow-hidden rounded-2xl">
          {UtilityCardsTemplate.map((utilityCard) => (
            <button
              key={utilityCard.title}
              type="button"
              className="flex min-h-24 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-3 text-center transition-transform duration-200 active:scale-95"
              onClick={utilityCard.onClick}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-orange-500/10 dark:bg-orange-400/15">
                {utilityCard.icon}
              </span>
              <span className="flex min-h-8 items-center justify-center px-1 text-xs font-semibold leading-snug tracking-tighter break-keep text-center text-foreground select-none">
                {utilityCard.title}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="academy-heading" className="mt-6">
        <h2
          id="academy-heading"
          className="mb-2 px-5 font-pretendard text-sm font-semibold text-muted-foreground"
        >
          아카데미
        </h2>

        <div className="grid grid-cols-[2fr_3fr] gap-2">
          {AcademyCardsTemplate.map((academyCard) => (
            <button
              key={academyCard.title}
              type="button"
              className="flex min-h-12 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-transform duration-200 active:scale-95"
              onClick={academyCard.onClick}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-300/50 dark:bg-neutral-800">
                {academyCard.icon}
              </span>
              <span className="select-none font-pretendard text-xs font-semibold leading-tight tracking-normal break-keep text-foreground">
                {academyCard.title}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="community-heading" className="mt-6">
        <h2
          id="community-heading"
          className="mb-2 px-5 font-pretendard text-sm font-semibold text-muted-foreground"
        >
          비트코인 커뮤니티
        </h2>

        <div className="grid grid-cols-[2fr_3fr] gap-2">
          {CommunityCardsTemplate.map((communityCard) => (
            <button
              key={communityCard.title}
              type="button"
              className="flex min-h-12 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-transform duration-200 active:scale-95"
              onClick={communityCard.onClick}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-300/50 dark:bg-neutral-800">
                {communityCard.icon}
              </span>
              <span className="select-none font-pretendard text-xs font-semibold leading-tight break-keep text-foreground">
                {communityCard.title}
              </span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
};

export default OrangeContent;
