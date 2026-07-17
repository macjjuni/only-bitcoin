"use client";

import { KIcon } from "kku-ui";
import { ChevronRight, ExternalLink, TableProperties } from "lucide-react";
import { useTransitionRouter } from "next-view-transitions";
import { useCallback } from "react";
import { allRouteList } from "@/shared/config/route";
import {
  DiscordIcon,
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
  CITADEL_DISCORD: "https://discord.gg/citadel21",
  ATOMIC_BTC_NOTION: "http://atomicbtc.kr",
  CITADEL_CAFE: "https://cafe.naver.com/btcforever",
  BTC_MAP: "http://btcmap.kr",
  FIAT_GOV_BITCOIN_DOC: "https://finished-snake-h7zp8jm.gamma.site",
  SATOSHOP: "https://satoshop.org",
  LN_FORTUNE: "https://ln-fortune.vercel.app",
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
          label="비트맥시 전용 밈 저장소"
          rightElement={<ChevronRight className="text-muted-foreground" />}
          onClick={handleMemeRoute}
        />
        <ListRow
          icon={<MinerIcon size={28} />}
          label="비트코인 평단가 계산 (DCA)"
          rightElement={<ChevronRight className="text-muted-foreground" />}
          onClick={handleDcaRoute}
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
        <ListRow
          icon={<LazyImage src="https://ln-fortune.vercel.app/favicon.ico" />}
          label="Lightning Fortune"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(EXTERNAL_LINKS.LN_FORTUNE)}
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

      {/* 커뮤니티 그룹 */}
      <ListGroup header="커뮤니티" className="!mt-4">
        <ListRow
          icon={<DiscordIcon size={28} />}
          label="BITCOIN⚡️CITADEL"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(EXTERNAL_LINKS.CITADEL_DISCORD)}
        />
        <ListRow
          icon={<NaverIcon size={28} />}
          label="비트코인⚡️지분전쟁: 시타델"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(EXTERNAL_LINKS.CITADEL_CAFE)}
        />
      </ListGroup>
    </>
  );
};

export default OrangePillContent;
