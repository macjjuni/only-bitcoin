"use client";

import { KIcon } from "kku-ui";
import { Building2, CalendarRange, ChevronRight, ExternalLink, TableProperties } from "lucide-react";
import { useTransitionRouter } from "next-view-transitions";
import { useCallback } from "react";
import { allRouteList } from "@/shared/config/route";
import {
  BuildingIcon,
  HalfCircleIcon,
  LazyImage,
  ListGroup,
  ListRow,
  MinerIcon,
  NaverIcon,
  PageIcon,
  ShootingStarIcon,
} from "@/shared/ui";
import { onRouteToExternalLink } from "@/shared/utils/common";

// region [Constants]
const EXTERNAL_LINKS = {
  ATOMIC_BTC_NOTION: "http://atomicbtc.kr",
  BTC_MAP: "http://btcmap.kr",
  FIAT_GOV_BITCOIN_DOC: "https://finished-snake-h7zp8jm.gamma.site",
  SATOSHOP: "https://satoshop.org",
} as const;
// endregion

const OrangePillContent = () => {
  // region [Hooks]
  const router = useTransitionRouter();
  // endregion

  // region [Privates]
  const handleMemeRoute = useCallback(() => {
    const routePath = allRouteList.find((item) => item.path.includes("meme"))?.path;

    if (!routePath) {
      console.warn("Meme 경로를 찾을 수 없습니다.");
      return;
    }

    router.push(routePath);
  }, [router]);

  const handleDcaRoute = useCallback(() => {
    const routePath = allRouteList.find((item) => item.path.includes("/dca"))?.path;

    if (!routePath) {
      console.warn("DCA 경로를 찾을 수 없습니다.");
      return;
    }

    router.push(routePath);
  }, [router]);

  const handleCagrRoute = useCallback(() => {
    const routePath = allRouteList.find((item) => item.path.includes("/cagr"))?.path;

    if (!routePath) {
      console.warn("월별 등락률 경로를 찾을 수 없습니다.");
      return;
    }

    router.push(routePath);
  }, [router]);

  const handleHalvingCountdownRoute = useCallback(() => {
    const routePath = allRouteList.find((item) => item.path.includes("/countdown"))?.path;

    if (!routePath) {
      console.warn("반감기 카운트다운 경로를 찾을 수 없습니다.");
      return;
    }

    router.push(routePath);
  }, [router]);

  const handleBtc2ApartmentRoute = useCallback(() => {
    const routePath = allRouteList.find((item) => item.path.includes("/btc2apartment"))?.path;

    if (!routePath) {
      console.warn("BTC to Apartment 경로를 찾을 수 없습니다.");
      return;
    }

    router.push(routePath);
  }, [router]);

  const handleTreasuryRoute = useCallback(() => {
    const routePath = allRouteList.find((item) => item.path.includes("/treasury"))?.path;

    if (!routePath) {
      console.warn("기업 트레저리 경로를 찾을 수 없습니다.");
      return;
    }

    router.push(routePath);
  }, [router]);

  const handleBIP39Route = useCallback(() => {
    const routePath = allRouteList.find((item) => item.path.includes("/bip39"))?.path;

    if (!routePath) {
      console.warn("BIP39 경로를 찾을 수 없습니다.");
      return;
    }

    router.push(routePath);
  }, [router]);

  return (
    <>
      {/* 유틸리티 */}
      <ListGroup header="유틸리티">
        <ListRow
          icon={<ShootingStarIcon size={28} />}
          label="비트맥시 밈 저장소"
          rightElement={<ChevronRight className="text-muted-foreground" />}
          onClick={handleMemeRoute}
        />
        <ListRow
          icon={<MinerIcon size={28} />}
          label="DCA 계산기"
          rightElement={<ChevronRight className="text-muted-foreground" />}
          onClick={handleDcaRoute}
        />
        <ListRow
          icon={<BuildingIcon size={26} />}
          label="아파트 몇 BTC?"
          rightElement={<ChevronRight className="text-muted-foreground" />}
          onClick={handleBtc2ApartmentRoute}
        />
        <ListRow
          icon={<CalendarRange size={26} />}
          label="월별 등락률"
          rightElement={<ChevronRight className="text-muted-foreground" />}
          onClick={handleCagrRoute}
        />
        <ListRow
          icon={<Building2 size={24} />}
          label="기업 비트코인 트레저리"
          rightElement={<ChevronRight className="text-muted-foreground" />}
          onClick={handleTreasuryRoute}
        />
        <ListRow
          icon={<HalfCircleIcon size={24} />}
          label="반감기 카운트다운"
          rightElement={<ChevronRight className="text-muted-foreground" />}
          onClick={handleHalvingCountdownRoute}
        />
        <ListRow
          icon={<TableProperties size={24} />}
          label="BIP39"
          rightElement={<ChevronRight className="text-muted-foreground" />}
          onClick={handleBIP39Route}
        />
      </ListGroup>

      {/* 서비스 */}
      <ListGroup header="서비스" className="!mt-4">
        <ListRow
          icon={<LazyImage src="https://satoshop.org/icon.svg?icon.12fecbu508vdu.svg" />}
          label="사토샵"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(EXTERNAL_LINKS.SATOSHOP)}
        />
        <ListRow
          icon={<NaverIcon size={28} />}
          label="비트코인 결제 매장"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(EXTERNAL_LINKS.BTC_MAP)}
        />
      </ListGroup>

      {/* 아카데미 */}
      <ListGroup header="아카데미" className="!mt-4">
        <ListRow
          icon={<KIcon icon="notion" size={28} />}
          label="ATOMIC⚡️₿ITCOIN 노션"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(EXTERNAL_LINKS.ATOMIC_BTC_NOTION)}
        />
        <ListRow
          icon={<PageIcon size={28} />}
          label="화폐와 정부 그리고 비트코인"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(EXTERNAL_LINKS.FIAT_GOV_BITCOIN_DOC)}
        />
      </ListGroup>
    </>
  );
};

export default OrangePillContent;
