import { GuideArticle, GuideParagraph, GuideSection, GuideWarningBox } from "@/shared/ui";

/** M2 개념과 비교 근거를 차트 아래에서 안내한다. */
export default function M2GuideArticle() {
  return (
    <GuideArticle
      title="M2란 무엇인가요?"
      subtitle="쉽게 말해 미국에 풀려 있는 달러의 총량입니다. 지갑 속 현금과 언제든 뽑을 수 있는 예금은 물론, 적금처럼 조금만 손대면 바로 현금이 되는 돈까지 모두 더한 값입니다. M2가 늘었다는 건 그만큼 시중에 돈이 더 풀렸다는 뜻입니다."
      className="w-full font-pretendard"
    >
      <GuideSection title="차트는 어떻게 읽나요?">
        <GuideParagraph>
          BTC는 완료된 달의 월별 마지막 USD 종가와 진행 중인 달의 최신 USD 종가를 로그 축으로
          표시합니다. 초기 몇 센트에서 지금까지의 배수 변화를 한 화면에 담으려면 로그 축이라야
          합니다. M2 미발표 월은 값을 임의로 채우지 않아서, 파란 선은 마지막 공식 발표 월에서
          끝납니다.
        </GuideParagraph>
      </GuideSection>

      <GuideSection title="왜 비트코인과 비교하나요?">
        <GuideParagraph>
          달러 공급이 늘면 화폐 한 단위의 구매력은 옅어집니다. 반대로 비트코인은 총 발행량이 2,100만
          개로 고정돼 있고 4년마다 신규 발행량이 절반으로 줄어, 통화량이 팽창할수록 희소성이
          도드라지는 구조입니다. 2020년 이후 M2가 가파르게 늘어난 구간에서 비트코인이 사상 최고가를
          새로 쓴 것도 두 지표를 나란히 놓고 보는 이유입니다.
        </GuideParagraph>
      </GuideSection>

      <GuideSection title="어떤 데이터를 쓰나요?">
        <GuideParagraph>
          M2는 미국 세인트루이스 연방준비은행 FRED의 M2SL 시리즈(계절조정 월간)를 사용하며 차트에는
          조 달러(T) 단위로 표시합니다. 비트코인은 2010년 8월부터의 blockchain.com 달러 시세를 월
          단위로 묶어 씁니다.
        </GuideParagraph>
      </GuideSection>

      <GuideWarningBox title="유의사항">
        <p className="text-sm leading-relaxed text-foreground">
          두 지표의 흐름이 닮아 보여도 상관관계일 뿐 인과관계가 아니며, 금리·규제·유동성처럼 차트에
          없는 변수가 함께 작용합니다. 투자 판단의 근거로 사용할 수 없습니다.
        </p>
      </GuideWarningBox>
    </GuideArticle>
  );
}
