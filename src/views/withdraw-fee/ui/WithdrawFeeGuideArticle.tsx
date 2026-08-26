import { Card, CardContent } from "@/shared/ui";

/** 검색 유입을 위한 설명 섹션. 서버 컴포넌트로 두어 HTML 에 그대로 포함되게 한다. */
export default function WithdrawFeeGuideArticle() {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col gap-4 p-4">
        <h2 className="text-md font-bold">출금 수수료, 왜 이렇게 비싼가요?</h2>

        <section className="flex flex-col gap-1.5">
          <h3 className="text-sm font-bold">거래소 수수료와 네트워크 수수료는 다릅니다</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            비트코인을 보낼 때 실제로 드는 비용은 채굴자에게 가는 네트워크 수수료뿐입니다. 이 값은
            거래 데이터 크기와 혼잡도에 따라 정해지고, 한산할 때는 수백 원 수준입니다. 반면 거래소
            출금 수수료는 거래소가 자체적으로 정한 고정 금액이라 네트워크가 아무리 한산해도 그대로
            빠져나갑니다.
          </p>
        </section>

        <section className="flex flex-col gap-1.5">
          <h3 className="text-sm font-bold">왜 고정 금액으로 받나요?</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            거래소는 여러 사용자의 출금을 하나의 트랜잭션으로 묶어 보내고(배치), 지갑 운영과 보안에
            드는 비용도 있습니다. 다만 그 비용이 시세와 혼잡도에 관계없이 고정되어 있다 보니,
            네트워크가 한산할수록 실비와의 격차가 커집니다.
          </p>
        </section>

        <section className="flex flex-col gap-1.5">
          <h3 className="text-sm font-bold">USDT는 무료인데 비트코인은 왜 2만원대인가요?</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            위 표를 보면 트론 USDT 출금은 무료이고 이더리움 USDT는 4 USDT입니다. 이더리움이
            비트코인보다 네트워크가 저렴해서가 아닙니다. 출금 수수료는 각 거래소가 정책으로 정하는
            값이라 자산과 망에 따라 제각각입니다. 비트코인만 유독 실비 대비 배율이 큰 것도 그
            때문입니다. 다만 수수료가 싸다는 이유로 자산을 고르면, 내가 무엇을 들고 있는지가 아니라
            거래소의 가격 정책이 판단을 대신하게 됩니다.
          </p>
        </section>

        <section className="flex flex-col gap-1.5">
          <h3 className="text-sm font-bold">출금 수수료를 아끼려면 어떻게 하나요?</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            출금 수수료는 보내는 금액과 무관하게 건당 고정입니다. 그래서 조금씩 자주 빼면 그만큼
            수수료를 여러 번 내게 됩니다. 자주 소액을 옮기기보다 어느 정도 모아서 한 번에 출금하는
            편이 유리합니다. 다만 거래소에 오래 둘수록 다른 위험을 안게 되므로, 수수료만 보고 판단할
            문제는 아닙니다.
          </p>
        </section>

        <section className="flex flex-col gap-1.5">
          <h3 className="text-sm font-bold">그래도 왜 출금해야 하나요?</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            거래소 계정의 잔고는 거래소가 나에게 갚아야 할 빚이지, 내가 가진 비트코인이 아닙니다.
            개인 키를 내가 들고 있어야 비로소 내 비트코인입니다. 출금 수수료는 그 소유권을 확보하는
            비용이고, 위에서 본 금액은 대개 그 값어치를 합니다.
          </p>
        </section>

        <p className="text-xs leading-relaxed text-muted-foreground">
          이 페이지의 수수료는 각 거래소가 공개한 값을 자동으로 가져와 표시합니다. 반영이 늦거나
          거래소가 값을 바꿀 수 있으니, 실제 출금 전에는 거래소 안내를 직접 확인하세요.
        </p>
      </CardContent>
    </Card>
  );
}
