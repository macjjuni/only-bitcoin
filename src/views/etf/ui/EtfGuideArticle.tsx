import { Card, CardContent, CollapseSection } from "@/shared/ui";

export function EtfGuideArticle() {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col gap-4 p-4">
        <h2 className="text-base font-bold">ETF 데이터는 어떻게 읽어야 하나요?</h2>

        <CollapseSection
          title="공식 순유입액이 아닌 추정치"
          defaultOpen
          contentClassName="pt-2 text-sm leading-relaxed text-muted-foreground"
        >
          <p>
            Xoomar는 각 발행사의 공개 파일에서 BTC 보유량을 읽고, 전 거래일 대비 보유량 증감에 수집
            시점의 기준 가격을 곱해 달러 흐름을 계산합니다. 따라서 화면에서는 모든 흐름을
            &ldquo;추정&rdquo;으로 표시합니다.
          </p>
        </CollapseSection>

        <CollapseSection
          title="왜 최신 날짜가 아닌 기준일을 사용하나요?"
          contentClassName="pt-2 text-sm leading-relaxed text-muted-foreground"
        >
          <p>
            ETF마다 파일 공개 시점이 달라 최신 날짜에 일부 종목만 존재할 수 있습니다. 일부 응답을
            전체 시장처럼 합산하지 않도록 추적 중인 ETF가 모두 존재하는 최근 거래일을 기준일로
            사용합니다.
          </p>
        </CollapseSection>

        <CollapseSection
          title="비정상 흐름은 어떻게 처리하나요?"
          contentClassName="pt-2 text-sm leading-relaxed text-muted-foreground"
        >
          <p>
            하루 추정 흐름의 절댓값이 해당 ETF AUM의 50% 이상이면 파일 단위 변경이나 파싱 오류
            가능성이 높다고 판단해 합계에서 제외합니다. 해당 ETF 자체는 숨기지 않고 검증 제외 상태로
            표시합니다.
          </p>
        </CollapseSection>

        <div className="flex flex-col gap-1 rounded-lg bg-bitcoin/10 px-3 py-2.5">
          <strong className="text-sm font-bold text-bitcoin">출처 및 유의사항</strong>
          <p className="text-sm leading-relaxed text-foreground">
            데이터는 미국 장 마감 후 갱신되는 Xoomar ETF Flows API를 사용합니다. 발행사 파일의
            누락이나 지연이 있을 수 있으며 투자 판단의 근거로 사용할 수 없습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
