import { useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { KIcon, KListGroup, KListRow } from "kku-ui";
import { ChevronRight, ExternalLink, Images, TableProperties } from "lucide-react";
import { PageLayout } from "@/layouts";
import { DiscordIcon, NaverIcon, PageIcon } from "@/components/ui/icon";
import { usePageAnimation, type UsePageAnimation } from "@/shared/hooks";
import router from "@/app/router";
import { LazyImage } from "@/components";

const CITADEL_DISCORD_URL = "https://discord.gg/citadel21" as const;
const ATOMIC_BTC_NOTION_URL = "http://atomicbtc.kr" as const;
const CITADEL_CAFE_URL = "https://cafe.naver.com/btcforever" as const;
const POW_URL = "https://powbitcoiner.com" as const;
const BTC_MAP_URL = "http://btcmap.kr/" as const;
const FIAT_GOV_BITCOIN_DOC_URL = "https://finished-snake-h7zp8jm.gamma.site" as const;
const SATOSHOP_URL = "https://store.btcmap.kr" as const;


export default function PremiumPage() {
  // region [Hooks]
  usePageAnimation(useOutletContext<UsePageAnimation>());
  const navigate = useNavigate();
  // endregion

  // region [Privates]
  const onRouteToExternalLink = useCallback((url: string) => {
    const anchorTag = document.createElement("a");
    anchorTag.href = url;
    anchorTag.target = "_blank";
    anchorTag.click();
    anchorTag.remove();
  }, []);

  const onRouteToBIP39 = useCallback(() => {
    const route = router.clientRoutes.find(item => item.path.includes("/bip39"));
    if (!route) {
      throw Error("Not found page url.");
    }
    navigate(route.path);
  }, [navigate]);
  // endregion

  return (
    <PageLayout className="pt-0.5">
      {/* 커뮤니티 그룹 */}
      <KListGroup header="커뮤니티">
        <KListRow
          icon={<DiscordIcon size={28} />}
          label="BITCOIN⚡️CITADEL"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(CITADEL_DISCORD_URL)}
        />
        <KListRow
          icon={<LazyImage src="https://powbitcoiner.com/favicon.ico" />}
          label="포우 POW"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(POW_URL)}
        />
        <KListRow
          icon={<NaverIcon size={28} />}
          label="비트코인⚡️지분전쟁: 시타델"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(CITADEL_CAFE_URL)}
        />
      </KListGroup>

      {/* 서비스 */}
      <KListGroup header="서비스">
        <KListRow
          icon={<LazyImage src="https://store.btcmap.kr/static/images/icons/icon-100x100.png" />}
          label="BTCmap"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(SATOSHOP_URL)}
        />
        <KListRow
          icon={<NaverIcon size={28} />}
          label="비트코인 결제 매장"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(BTC_MAP_URL)}
        />
      </KListGroup>

      {/* 아카데미 */}
      <KListGroup header="아카데미">
        <KListRow
          icon={<KIcon icon="notion" size={28} />}
          label="ATOMIC⚡️₿ITCOIN 노션"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(ATOMIC_BTC_NOTION_URL)}
        />
        <KListRow
          icon={<PageIcon size={28} />}
          label="화폐와 정부 그리고 비트코인"
          rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
          onClick={() => onRouteToExternalLink(FIAT_GOV_BITCOIN_DOC_URL)}
        />
      </KListGroup>

      {/* 유틸리티 */}
      <KListGroup header="유틸리티">
        <KListRow
          icon={<Images size={28} />}
          label="밈 저장소"
          rightElement={<ChevronRight className="text-muted-foreground" />}
          onClick={() => navigate("/meme")}
        />
        <KListRow
          icon={<TableProperties size={28} />}
          label="BIP39"
          rightElement={<ChevronRight className="text-muted-foreground" />}
          onClick={onRouteToBIP39}
        />
      </KListGroup>
    </PageLayout>
  );
}