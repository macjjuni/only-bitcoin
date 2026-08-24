"use client";

import { Building2, TableProperties } from "lucide-react";
import { useTransitionRouter } from "next-view-transitions";
import { useCallback, useMemo } from "react";
import { allRouteList } from "@/shared/config/route";
import {
  BuildingIcon,
  CalendarIcon,
  HalfCircleIcon,
  MinerIcon,
  ShootingStarIcon,
} from "@/shared/ui";

const ICON_CLASS = "text-orange-500 dark:text-orange-400";

const OrangePillContent = () => {
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

  const onClickTreasuryUtility = useCallback(() => {
    navigateToUtility("/treasury", "기업 비트코인 트레저리");
  }, [navigateToUtility]);

  const onClickHalvingCountdownUtility = useCallback(() => {
    navigateToUtility("/countdown", "반감기 카운트다운");
  }, [navigateToUtility]);

  const onClickBIP39Utility = useCallback(() => {
    navigateToUtility("/bip39", "BIP39");
  }, [navigateToUtility]);
  // endregion

  // region [Templates]
  const UtilityCardsTemplate = useMemo(
    () => [
      {
        title: "밈 저장소",
        icon: <ShootingStarIcon size={30} />,
        onClick: onClickMemeUtility,
      },
      {
        title: "아파트 몇 BTC?",
        icon: <BuildingIcon size={26} className={ICON_CLASS} />,
        onClick: onClickBtc2ApartmentUtility,
      },
      {
        title: "트레저리",
        icon: <Building2 size={26} strokeWidth={1.8} />,
        onClick: onClickTreasuryUtility,
      },
      {
        title: "DCA 계산기",
        icon: <MinerIcon size={32} />,
        onClick: onClickDcaUtility,
      },
      {
        title: "월별 등락률",
        icon: <CalendarIcon size={26} className={ICON_CLASS} />,
        onClick: onClickCagrUtility,
      },
      {
        title: "반감기 카운트",
        icon: <HalfCircleIcon size={24} />,
        onClick: onClickHalvingCountdownUtility,
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
      onClickHalvingCountdownUtility,
      onClickMemeUtility,
      onClickTreasuryUtility,
    ],
  );
  // endregion

  return (
    <section aria-labelledby="utility-heading">
      <h2 id="utility-heading" className="mb-2 px-1 text-sm font-semibold text-muted-foreground">
        유틸리티
      </h2>

      <div className="glass-surface grid grid-cols-4 overflow-hidden rounded-2xl border border-neutral-300 px-2 py-4 dark:border-neutral-600">
        {UtilityCardsTemplate.map((utilityCard) => (
          <button
            key={utilityCard.title}
            type="button"
            className="flex min-h-24 flex-col items-center justify-center gap-3 rounded-xl px-1 py-4 text-center transition-[background-color,transform] duration-200 hover:bg-orange-500/5 active:scale-95"
            onClick={utilityCard.onClick}
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-orange-500/10 dark:bg-orange-400/15">
              {utilityCard.icon}
            </span>
            <span className="text-xs font-semibold whitespace-nowrap leading-tight break-keep text-foreground">
              {utilityCard.title}
            </span>
          </button>
        ))}
      </div>

      {/* 서비스 영역 임시 비활성화 */}
      {/* 아카데미 영역 임시 비활성화 */}
    </section>
  );
};

export default OrangePillContent;
