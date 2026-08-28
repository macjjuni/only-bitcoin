import { GuideArticle, GuideParagraph, GuideSection, GuideWarningBox } from "@/shared/ui";

/** 검색 유입을 위한 설명 섹션. 서버 컴포넌트로 두어 HTML 에 그대로 포함되게 한다. */
export default function TreasuryGuideArticle() {
  return (
    <GuideArticle title="상장기업 비트코인 트레저리란?" className="w-full">
      <GuideSection title="현금 대신 비트코인을 재무제표에 담는 전략">
        <GuideParagraph>
          트레저리(Treasury)는 기업이 보유한 자산을 뜻합니다. 법정화폐의 구매력이 시간이 지날수록
          희석되기 때문에, 일부 상장기업은 여유 현금을 비트코인으로 바꿔 대차대조표에 자산으로
          올립니다. 이 페이지는 공시를 통해 보유 사실이 확인된 상장기업만 집계합니다.
        </GuideParagraph>
      </GuideSection>

      <GuideSection title="평단가와 수익률은 어떻게 계산하나요?">
        <GuideParagraph>
          평단가는 <b>공시된 매입 총액 ÷ 보유 수량</b>이고, 수익률은{" "}
          <b>(평가액 - 매입액) ÷ 매입액</b>
          입니다. 매입 금액을 공시하지 않은 기업은 평단가와 수익률이 &ldquo;-&rdquo; 로 표시되며,
          전체 합산 수익률에서도 매입액 0으로 잡히므로 실제보다 보수적으로 나옵니다.
        </GuideParagraph>
      </GuideSection>

      <GuideSection title="발행량 비중은 무엇을 뜻하나요?">
        <GuideParagraph>
          비트코인의 최대 발행량 2,100만 개 중 해당 기업이 차지하는 비율입니다. 잃어버린 코인을
          감안하면 실제 유통 물량 대비 비중은 이 값보다 더 큽니다.
        </GuideParagraph>
      </GuideSection>

      <GuideWarningBox title="유의사항">
        <p className="text-sm leading-relaxed text-foreground">
          공시 시점과 집계 시점의 차이, 미공시 매입분 등으로 실제 보유량과 다를 수 있습니다.
          <b> 투자 판단의 근거로 삼지 마세요.</b>
        </p>
      </GuideWarningBox>
    </GuideArticle>
  );
}
