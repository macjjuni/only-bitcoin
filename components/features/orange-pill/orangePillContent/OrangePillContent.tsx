"use client";

import { memo, useCallback } from "react";
import { KIcon, KListGroup, KListRow } from "kku-ui";
import { DiscordIcon, LazyImage, NaverIcon, PageIcon } from "@/components";
import { ChevronRight, ExternalLink, Images, TableProperties } from "lucide-react";
import { onRouteToExternalLink } from "@/shared/utils/common";
import { useTransitionRouter } from "next-view-transitions";
import { allRouteList } from "@/shared/config/route";


// region [Constants]
const EXTERNAL_LINKS = {
  CITADEL_DISCORD: "https://discord.gg/citadel21",
  ATOMIC_BTC_NOTION: "http://atomicbtc.kr",
  CITADEL_CAFE: "https://cafe.naver.com/btcforever",
  POW: "https://powbitcoiner.com",
  BTC_MAP: "http://btcmap.kr/",
  FIAT_GOV_BITCOIN_DOC: "https://finished-snake-h7zp8jm.gamma.site",
  SATOSHOP: "https://store.btcmap.kr"
} as const;
// endregion


const OrangePillContent = () => {

  // region [Hooks]
  const router = useTransitionRouter();
  // endregion

// region [Privates]
  const handleMemeRoute = useCallback(() => {
    const routePath = allRouteList.find(item => item.path.includes("meme"))?.path;

    if (!routePath) {
      console.warn("Meme 경로를 찾을 수 없습니다.");
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
      {/* 커뮤니티 그룹 */}
      <KListGroup header="커뮤니티" className="mt-1">
        <KListRow
          icon={<DiscordIcon size={28} />}
          label="BITCOIN⚡️CITADEL"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(EXTERNAL_LINKS.CITADEL_DISCORD)}
        />
        <KListRow
          icon={<LazyImage src="https://powbitcoiner.com/favicon.ico" />}
          label="포우 POW" rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(EXTERNAL_LINKS.POW)}
        />
        <KListRow
          icon={<NaverIcon size={28} />} label="비트코인⚡️지분전쟁: 시타델"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(EXTERNAL_LINKS.CITADEL_CAFE)}
        />
      </KListGroup>

      {/* 서비스 */}
      <KListGroup header="서비스">
        <KListRow
          icon={<LazyImage src="https://store.btcmap.kr/static/images/icons/icon-100x100.png" />}
          label="BTCmap" rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(EXTERNAL_LINKS.SATOSHOP)}
        />
        <KListRow
          icon={<NaverIcon size={28} />} label="비트코인 결제 매장"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(EXTERNAL_LINKS.BTC_MAP)}
        />
      </KListGroup>

      {/* 아카데미 */}
      <KListGroup header="아카데미">
        <KListRow
          icon={<KIcon icon="notion" size={28} />} label="ATOMIC⚡️₿ITCOIN 노션"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(EXTERNAL_LINKS.ATOMIC_BTC_NOTION)} />
        <KListRow
          icon={<PageIcon size={28} />} label="화폐와 정부 그리고 비트코인"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(EXTERNAL_LINKS.FIAT_GOV_BITCOIN_DOC)} />
      </KListGroup>

      {/* 유틸리티 */}
      <KListGroup header="유틸리티">
        <KListRow
          icon={<Images size={28} />} label="비트맥시 전용 밈 저장소"
          rightElement={<ChevronRight className="text-muted-foreground" />}
          onClick={handleMemeRoute}
        />
        <KListRow
          icon={<TableProperties size={28} />} label="BIP39"
          rightElement={<ChevronRight className="text-muted-foreground" />}
          onClick={handleBIP39Route}
        />
      </KListGroup>
    </>
  );
};

const MemoizedOrangePillContent = memo(OrangePillContent);
MemoizedOrangePillContent.displayName = "OrangePillContent";

export default MemoizedOrangePillContent;