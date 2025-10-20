import { useCallback } from "react";
import { KIcon } from "kku-ui";
import { useOutletContext, useNavigate } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { PageLayout } from "@/layouts";
import { LazyImage, FormRow } from "@/components";
import { DiscordIcon, LinkIcon, NaverIcon, PageIcon, ListIcon } from "@/components/icon";
import router from "@/app/router";
import "./OrangePillPage.scss";


const citadelDiscordUrl = "https://discord.gg/citadel21" as const;
const atomicNotionUrl = "http://atomicbtc.kr" as const;
const citadelCafe = "https://cafe.naver.com/btcforever" as const;
const btcMapUrl = "http://btcmap.kr/" as const;
const fiatBitcoinUrl = "https://finished-snake-h7zp8jm.gamma.site" as const;


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
  }, []);

  const onRouteCitadel = useCallback(() => {
    onRouteToExternalLink(citadelDiscordUrl);
  }, []);

  const onRouteToAtomicNotion = useCallback(() => {
    onRouteToExternalLink(atomicNotionUrl);
  }, []);

  const onRouteToCitadelCafe = useCallback(() => {
    onRouteToExternalLink(citadelCafe);
  }, []);

  const onRouteToBtcMap = useCallback(() => {
    onRouteToExternalLink(btcMapUrl);
  }, []);

  const onRouteToFiatAndBitcoin = useCallback(() => {
    onRouteToExternalLink(fiatBitcoinUrl);
  }, []);

  const onRouteToMeme = useCallback(() => {
    navigate("/meme");
  }, []);

  const onRouteToBIP39 = useCallback(() => {

    const route = router.clientRoutes.find(item => item.path.includes('bip39'));
    if (!route) { throw Error('Not found page url.') }

    navigate(route.path);
  }, []);
  // endregion

  return (
    <PageLayout className="orange-pill__page__area">
      <div>
        <FormRow icon={<KIcon icon="notion" size={28} />} label="ATOMIC⚡️₿ITCOIN 노션">
          <button type="button" onClick={onRouteToAtomicNotion}>
            <LinkIcon size={24} />
          </button>
        </FormRow>
        <FormRow icon={<PageIcon size={28} style={{ marginTop: "4px" }} />} label="화폐와 정부 그리고 비트코인">
          <button type="button" onClick={onRouteToFiatAndBitcoin}>
            <LinkIcon size={24} />
          </button>
        </FormRow>
        <FormRow icon={<DiscordIcon size={28} />} label="비트코인 지분전쟁: 시타델">
          <button type="button" onClick={onRouteCitadel}>
            <LinkIcon size={24} />
          </button>
        </FormRow>
        <FormRow icon={<NaverIcon size={28} />} label="비트코인 지분전쟁 카페">
          <button type="button" onClick={onRouteToCitadelCafe}>
            <LinkIcon size={24} />
          </button>
        </FormRow>
        <FormRow icon={<NaverIcon size={28} />} label="비트코인 결제 매장">
          <button type="button" onClick={onRouteToBtcMap}>
            <LinkIcon size={24} />
          </button>
        </FormRow>
        <FormRow icon={<ListIcon size={32} />} label="BIP39">
          <button type="button" onClick={onRouteToBIP39}>
            <LinkIcon size={24} />
          </button>
        </FormRow>
        <FormRow icon={
          <div style={{ width: 28, height: 28 }}>
            <LazyImage src="https://image-store-one.vercel.app/image/ysku.webp" alt="meme" width={28} height={28} />
          </div>
        } label="밈 저장소">
          <button type="button" onClick={onRouteToMeme}>
            <LinkIcon size={24} />
          </button>
        </FormRow>
      </div>
    </PageLayout>
  );
}
