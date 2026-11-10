import { GuideArticle, GuideParagraph, GuideSection, GuideWarningBox } from "@/shared/ui";

const SOURCE_URL = "https://www.tftc.io/bitcoin-etf-flows";

export default function EtfGuideArticle() {
  return (
    <GuideArticle title="ETF 데이터는 어떻게 읽어야 하나요?" className="w-full font-pretendard">
      <GuideSection title="순유입은 무엇을 뜻하나요?" defaultOpen>
        <GuideParagraph>
          순유입은 그날 새로 만들어진 ETF 지분의 금액에서 환매된 지분의 금액을 뺀 값입니다. 양수면
          ETF로 자금이 들어온 날이고, 음수면 빠져나간 날입니다. 미국에 상장된 비트코인 현물 ETF만
          포함하며, 선물 ETF와 미국 밖에 상장된 상품은 들어 있지 않습니다.
        </GuideParagraph>
      </GuideSection>

      <GuideSection title="데이터는 언제 갱신되나요?">
        <GuideParagraph>
          원천은 미국 장이 끝나고 발행사가 수치를 공시한 뒤 하루 두 번 갱신됩니다. 발행사가 늦게
          공시하거나 수치를 정정하면 최근 거래일의 값이 나중에 바뀔 수 있습니다. 미국 휴장일은
          거래일에서 뺍니다.
        </GuideParagraph>
      </GuideSection>

      <GuideSection title="추정 보유량은 어떻게 계산하나요?">
        <GuideParagraph>
          전체 운용자산을 같은 날의 비트코인 가격으로 나눈 환산값입니다. 발행사가 공시한 보유량을
          합친 값이 아니므로, 가격 기준 시각의 차이만큼 실제 보유량과 다를 수 있습니다.
        </GuideParagraph>
      </GuideSection>

      <GuideWarningBox title="출처 및 유의사항">
        <p className="text-sm leading-relaxed text-foreground">
          데이터:{" "}
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            The Commoner Bitcoin ETF Tracker by TFTC
          </a>{" "}
          (CC BY 4.0). 원천은 SoSoValue 집계와 Farside Investors가 정리한 발행사 공시입니다.
          누락이나 지연이 있을 수 있으며 투자 판단의 근거로 사용할 수 없습니다.
        </p>
      </GuideWarningBox>
    </GuideArticle>
  );
}
