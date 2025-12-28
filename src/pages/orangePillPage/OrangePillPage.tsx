import { useCallback } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { KIcon, KListGroup, KListRow } from "kku-ui";
import { ExternalLink, Images, TableProperties, ChevronRight } from "lucide-react";
import { PageLayout } from "@/layouts";
import { DiscordIcon, NaverIcon, PageIcon } from "@/components/ui/icon";
import { usePageAnimation, type UsePageAnimation } from "@/shared/hooks";
import router from "@/app/router";

const CITADEL_DISCORD_URL = "https://discord.gg/citadel21" as const;
const ATOMIC_BTC_NOTION_URL = "http://atomicbtc.kr" as const;
const CITADEL_CAFE_URL = "https://cafe.naver.com/btcforever" as const;
const BTC_MAP_URL = "http://btcmap.kr/" as const;
const FIAT_GOV_BITCOIN_DOC_URL = "https://finished-snake-h7zp8jm.gamma.site" as const;


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
    const route = router.clientRoutes.find(item => item.path.includes('/bip39'));
    if (!route) { throw Error('Not found page url.') }
    navigate(route.path);
  }, [navigate]);
  // endregion

  return (
    <PageLayout className="pt-0.5">
      <div className="flex flex-col gap-2">
        {/* 리소스 및 커뮤니티 그룹 */}
        <KListGroup header="외부 서비스">
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
          <KListRow
            icon={<DiscordIcon size={28} />}
            label="비트코인 지분전쟁: 시타델"
            rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
            onClick={() => onRouteToExternalLink(CITADEL_DISCORD_URL)}
          />
          <KListRow
            icon={<NaverIcon size={28} />}
            label="비트코인 지분전쟁 카페"
            rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
            onClick={() => onRouteToExternalLink(CITADEL_CAFE_URL)}
          />
          <KListRow
            icon={<NaverIcon size={28} />}
            label="비트코인 결제 매장"
            rightElement={<ExternalLink size={20} className="text-muted-foreground" />}
            onClick={() => onRouteToExternalLink(BTC_MAP_URL)}
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
      </div>
    </PageLayout>
  );
}