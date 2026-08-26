"use client";

import { KIcon } from "kku-ui";
import { Building2, Ellipsis, HandCoins, TableProperties } from "lucide-react";
import { useTransitionRouter } from "next-view-transitions";
import { type ReactNode, useCallback, useMemo } from "react";
import { allRouteList } from "@/shared/config/route";
import {
  BuildingIcon,
  CalendarIcon,
  DiscordIcon,
  HalfCircleIcon,
  MinerIcon,
  NaverIcon,
  PageIcon,
  PageTitle,
  ShootingStarIcon,
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
  /** 개발 중 항목은 진입 경로가 없어 핸들러를 두지 않음. */
  onClick?: () => void;
  /** 개발 중 표시. 버튼을 잠그고 깜빡이게 함. */
  isPending?: boolean;
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
        title: "밈 저장소",
        icon: <ShootingStarIcon size={32} />,
        onClick: onClickMemeUtility,
      },
      {
        title: "아파트 몇 BTC?",
        icon: <BuildingIcon size={28} className={ICON_CLASS} />,
        onClick: onClickBtc2ApartmentUtility,
      },
      {
        title: "출금 수수료",
        icon: <HandCoins size={28} strokeWidth={1.8} />,
        onClick: onClickWithdrawFeeUtility,
      },
      {
        title: "트레저리",
        icon: <Building2 size={28} strokeWidth={1.8} />,
        onClick: onClickTreasuryUtility,
      },
      {
        title: "DCA 계산기",
        icon: <MinerIcon size={34} />,
        onClick: onClickDcaUtility,
      },
      {
        title: "월별 등락률",
        icon: <CalendarIcon size={28} className={ICON_CLASS} />,
        onClick: onClickCagrUtility,
      },
      {
        title: "반감기 카운트",
        icon: <HalfCircleIcon size={26} />,
        onClick: onClickHalvingCountdownUtility,
      },
      {
        title: "BIP39",
        icon: <TableProperties size={28} strokeWidth={1.8} />,
        onClick: onClickBIP39Utility,
      },
      {
        title: "개발중",
        icon: <Ellipsis size={26} strokeWidth={1.8} />,
        isPending: true,
      },
    ],
    [
      onClickBIP39Utility,
      onClickBtc2ApartmentUtility,
      onClickCagrUtility,
      onClickDcaUtility,
      onClickHalvingCountdownUtility,
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
              disabled={utilityCard.isPending}
              className={`flex min-h-24 flex-col items-center justify-center gap-3 rounded-xl px-1 py-3 text-center transition-transform duration-200 ${
                utilityCard.isPending
                  ? "animate-pulse cursor-default motion-reduce:animate-none"
                  : "active:scale-95"
              }`}
              onClick={utilityCard.onClick}
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-orange-500/10 dark:bg-orange-400/15">
                {utilityCard.icon}
              </span>
              <span className="select-none text-xs font-semibold whitespace-nowrap leading-tight break-keep text-foreground">
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
              <span className="select-none text-xs font-semibold leading-tight break-keep text-foreground">
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
              <span className="select-none text-xs font-semibold leading-tight break-keep text-foreground">
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
