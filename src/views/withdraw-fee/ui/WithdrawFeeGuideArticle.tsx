import type { ReactNode } from "react";
import { Card, CollapseSection } from "@/shared/ui";

interface GuideSectionProps {
  title: string;
  children: ReactNode;
}

const GuideSection = ({ title, children }: GuideSectionProps) => (
  <CollapseSection
    title={<h3 className="m-0 text-base font-bold">{title}</h3>}
    className="border-b-[0.75px] border-neutral-300 last:border-none dark:border-neutral-600"
    summaryClassName="py-4 text-base"
    contentClassName="flex flex-col gap-3 pb-5"
  >
    {children}
  </CollapseSection>
);

const GuideParagraph = ({ children }: { children: ReactNode }) => (
  <p className="text-sm leading-relaxed opacity-90">{children}</p>
);

/** 검색 유입을 위한 설명 섹션. 접힌 내용도 HTML에 포함되는 네이티브 details를 사용한다. */
export default function WithdrawFeeGuideArticle() {
  return (
    <Card className="w-full font-pretendard">
      <article className="flex flex-col gap-2 p-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-[18px] leading-6 tracking-tight font-bold">
            출금 수수료, 왜 이렇게 비싼가요?
          </h2>
          <p className="text-sm leading-relaxed opacity-80">
            거래소 출금 수수료가 어떻게 정해지는지, 비트코인을 개인 지갑으로 옮길 때 무엇을 확인해야
            하는지 정리했습니다.
          </p>
        </header>

        <div className="flex flex-col">
          <GuideSection title="거래소 수수료와 네트워크 수수료는 다릅니다">
            <GuideParagraph>
              비트코인을 보낼 때 실제로 드는 비용은 채굴자에게 가는 네트워크 수수료뿐입니다. 이 값은
              거래 데이터 크기와 혼잡도에 따라 정해지고, 한산할 때는 수백 원 수준입니다. 반면 거래소
              출금 수수료는 거래소가 자체적으로 정한 고정 금액이라 네트워크가 아무리 한산해도 그대로
              빠져나갑니다.
            </GuideParagraph>
          </GuideSection>

          <GuideSection title="왜 고정 금액으로 받나요?">
            <GuideParagraph>
              거래소는 여러 사용자의 출금을 하나의 트랜잭션으로 묶어 보내고(배치), 지갑 운영과
              보안에 드는 비용도 있습니다. 다만 거래소 출금 수수료는 네트워크가 한산해져도 즉시
              낮아지지 않을 수 있습니다.
            </GuideParagraph>
          </GuideSection>

          <GuideSection title="자산·네트워크마다 출금 수수료가 다른 이유는 무엇인가요?">
            <GuideParagraph>
              거래소 출금 수수료는 자산과 네트워크별 정책으로 정해지며, 해당 네트워크의 실제 전송
              비용과 일치하지 않을 수 있습니다. 수수료가 싸다는 이유로 다른 자산이나 네트워크를
              선택하면 비트코인을 출금하는 것이 아닙니다. 비트코인을 자기수탁하려면 수신 지갑이
              지원하는 Bitcoin 네트워크를 선택해야 합니다.
            </GuideParagraph>
          </GuideSection>

          <GuideSection title="출금 수수료를 아끼려면 어떻게 하나요?">
            <GuideParagraph>
              출금 수수료는 보내는 금액과 무관하게 건당 고정입니다. 그래서 조금씩 자주 빼면 그만큼
              수수료를 여러 번 내게 됩니다. 자주 소액을 옮기기보다 어느 정도 모아서 한 번에 출금하는
              편이 유리합니다. 다만 거래소에 오래 둘수록 다른 위험을 안게 되므로, 수수료만 보고
              판단할 문제는 아닙니다.
            </GuideParagraph>
            <GuideParagraph>
              국내 거래소보다 비트코인 출금 수수료가 낮은 해외 거래소를 이용하는 것도 방법입니다.
              다만 거래소의 홍보나 평판을 그대로 믿지 말고, 실제 출금 수수료와 최소 출금액, 출금
              가능 여부를 직접 확인하세요. 처음 이용할 때는 소액을 개인 지갑으로 출금해 검증하고,
              필요한 거래가 끝나면 거래소에 머무는 금액과 시간을 줄이는 편이 좋습니다. 낮은 수수료를
              선택하며 생기는 보관·출금 위험은 각자가 감당해야 합니다.
            </GuideParagraph>
          </GuideSection>

          <GuideSection title="그럼에도 왜 출금해야 하나요?">
            <GuideParagraph>
              거래소 계정의 잔고는 거래소가 나에게 갚아야 할 빚이지, 내가 가진 비트코인이 아닙니다.
              개인 키를 내가 들고 있어야 비로소 내 비트코인입니다. 출금 수수료는 그 소유권을
              확보하는 비용이고, 위에서 본 금액은 대개 그 값어치를 합니다.
            </GuideParagraph>
          </GuideSection>
        </div>
      </article>
    </Card>
  );
}
