import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { KButton, KIcon } from "kku-ui";
import { useOutletContext } from "react-router";
import { usePageAnimation } from "@/shared/hooks";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { PageLayout } from "@/layouts";
import { FormRow } from "@/pages/settingsPage/components";
import { DiscordIcon, MemeIcon, NaverIcon } from "@/components/icon";
import "./OrangePillPage.scss";


const citadelDiscordUrl = 'https://discord.gg/citadel21' as const;
const atomicNotionUrl = 'http://atomicbtc.kr' as const;
const citadelCafe = 'https://cafe.naver.com/btcforever' as const;
const btcMapUrl = 'http://btcmap.kr/' as const;
const fiatBitcoinUrl = 'https://finished-snake-h7zp8jm.gamma.site' as const;

export default function PremiumPage() {

  // region [Hooks]
  usePageAnimation(useOutletContext<UsePageAnimation>());
  const navigate = useNavigate();
  // endregion


  // region [Privates]
  const onRouteToExternalLink = useCallback((url: string) => {
    const anchorTag = document.createElement('a');
    anchorTag.href = url;
    anchorTag.target = '_blank';
    anchorTag.click();
  }, [])

  const onRouteCitadel = useCallback(() => {
    onRouteToExternalLink(citadelDiscordUrl);
  }, []);

  const onRouteToAtomicNotion = useCallback(() => {
    onRouteToExternalLink(atomicNotionUrl)
  }, []);

  const onRouteToCitadelCafe = useCallback(() => {
    onRouteToExternalLink(citadelCafe)
  }, []);

  const onRouteToBtcMap = useCallback(() => {
    onRouteToExternalLink(btcMapUrl)
  }, []);

  const onRouteToFiatAndBitcoin = useCallback(() => {
    onRouteToExternalLink(fiatBitcoinUrl);
  }, []);

  const onRouteToMeme = useCallback(() => {
    navigate("/meme");
  }, []);
  // endregion

  return (
    <PageLayout className="orange-pill__page__area">
      <div>
        <FormRow icon={<KIcon icon="notion" size={28} />} label="ATOMIC⚡️₿ITCOIN 노션">
          <KButton variant="primary" label="이동" onClick={onRouteToAtomicNotion} />
        </FormRow>
        <FormRow icon={<KIcon icon="book" size={28} />} label="화폐와 정부 그리고 비트코인">
          <KButton variant="primary" label="이동" onClick={onRouteToFiatAndBitcoin} />
        </FormRow>
        <FormRow icon={<DiscordIcon size={28} />} label="비트코인 지분전쟁: 시타델">
          <KButton variant="primary" label="이동" onClick={onRouteCitadel} />
        </FormRow>
        <FormRow icon={<NaverIcon size={28} />} label="비트코인 지분전쟁 카페">
          <KButton variant="primary" label="이동" onClick={onRouteToCitadelCafe} />
        </FormRow>
        <FormRow icon={<NaverIcon size={28} />} label="비트코인 결제 매장">
          <KButton variant="primary" label="이동" onClick={onRouteToBtcMap} />
        </FormRow>
        <FormRow icon={<MemeIcon size={28} />} label="밈 저장소">
          <KButton variant="primary" label="이동" onClick={onRouteToMeme} />
        </FormRow>
      </div>
    </PageLayout>
  );
}
