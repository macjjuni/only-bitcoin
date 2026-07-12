"use client";

import { memo, type ReactNode } from "react";
import { Card, CollapseSection, HighlightText } from "@/shared/ui";

interface GuideSectionTypes {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

const GuideSection = ({ title, defaultOpen = false, children }: GuideSectionTypes) => (
  <CollapseSection
    title={<h3 className="m-0 text-base font-bold">{title}</h3>}
    defaultOpen={defaultOpen}
    className="border-b-[0.75px] border-neutral-300 dark:border-neutral-600 last:border-none"
    summaryClassName="py-4 text-base"
    contentClassName="flex flex-col gap-3 pb-5"
  >
    {children}
  </CollapseSection>
);

const GuideParagraph = ({ children }: { children: ReactNode }) => (
  <p className="text-sm opacity-90 leading-relaxed">{children}</p>
);

const BlocksGuideArticle = () => {
  return (
    <Card className="w-full">
      <article className="flex flex-col gap-2 p-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-[18px] font-bold">비트코인 블록 이해하기</h2>
          <p className="text-sm opacity-80 leading-relaxed">
            블록, 채굴, 반감기, 수수료까지 비트코인 네트워크의 핵심 개념을 처음 접하는 분도 쉽게
            이해할 수 있도록 정리했습니다.
          </p>
        </header>

        <div className="flex flex-col">
          <GuideSection title="비트코인 블록이란?" defaultOpen>
            <GuideParagraph>
              블록은 비트코인 거래 내역을 담는 하나의 묶음입니다. 여러 개의 거래(트랜잭션)가 모여
              하나의 블록을 이루고, 이 블록들이 사슬처럼 순서대로 연결되어 모두가 함께 나눠 갖는{" "}
              <HighlightText>분산 장부</HighlightText>를 이룹니다.
            </GuideParagraph>
            <GuideParagraph>
              각 블록에는 이전 블록의 정보(해시)가 함께 기록됩니다. 그래서 하나의 블록을 위조하려면
              그 뒤에 연결된 모든 블록을 다시 만들어야 하고, 이 구조 덕분에 기록을 사실상 되돌리거나
              조작할 수 없습니다.
            </GuideParagraph>
            <GuideParagraph>
              비트코인 네트워크는 평균 <HighlightText>약 10분</HighlightText>에 하나씩 새로운 블록을
              만들도록 설계되어 있습니다. 거래가 블록에 담겨 연결되면
              &lsquo;승인(confirmation)&rsquo;을 받았다고 표현하며, 승인이 쌓일수록 그 거래는 더
              안전하게 확정됩니다.
            </GuideParagraph>
          </GuideSection>

          <GuideSection title="채굴(Mining)은 어떻게 이뤄지나요?">
            <GuideParagraph>
              채굴은 새로운 블록을 만들어 기존 장부에 이어 붙이는 과정입니다. 전 세계의 채굴자들이
              특정 조건을 만족하는 값을 찾기 위해 컴퓨터로 막대한 계산을 반복하는데, 이 방식을{" "}
              <HighlightText>작업증명(PoW, Proof of Work)</HighlightText>이라고 부릅니다.
            </GuideParagraph>
            <GuideParagraph>
              가장 먼저 정답을 찾은 채굴자가 블록을 만들 권리를 얻고, 그 보상으로 새로 발행되는
              비트코인과 블록에 담긴 거래 수수료를 받습니다. 이 보상이 채굴자들이 네트워크를
              유지하도록 하는 경제적 동기입니다.
            </GuideParagraph>
            <GuideParagraph>
              네트워크는 약 2주(2,016개 블록)마다 채굴 <HighlightText>난이도</HighlightText>를
              자동으로 조정합니다. 채굴에 참여하는 계산 능력(해시레이트)이 늘면 난이도를 올리고,
              줄면 낮춰서 블록 생성 간격이 평균 10분으로 유지되도록 맞춥니다.
            </GuideParagraph>
          </GuideSection>

          <GuideSection title="반감기(Halving)란 무엇인가요?">
            <GuideParagraph>
              반감기는 채굴자가 새 블록을 만들 때 받는 비트코인 보상이 절반으로 줄어드는 시점을
              말합니다. 약 <HighlightText>21만 개</HighlightText>의 블록이 쌓일 때마다(대략 4년
              주기) 한 번씩 찾아옵니다.
            </GuideParagraph>
            <GuideParagraph>
              최초에 블록당 50 BTC였던 보상은 반감기를 거치며 25, 12.5, 6.25 BTC로 계속
              줄어들었습니다. 이런 방식으로 비트코인의 총 발행량은{" "}
              <HighlightText>2,100만 개</HighlightText>로 미리 정해져 있으며, 새 코인의 공급 속도는
              시간이 갈수록 느려집니다.
            </GuideParagraph>
            <GuideParagraph>
              공급이 줄어드는 일정이 코드에 고정되어 있다는 점이 비트코인을{" "}
              <HighlightText>디지털 금</HighlightText>에 비유하는 이유입니다. 마지막 비트코인은 대략
              2140년경에 채굴될 것으로 예상되며, 그 이후 채굴자는 거래 수수료만으로 보상을 받게
              됩니다.
            </GuideParagraph>
          </GuideSection>

          <GuideSection title="트랜잭션 수수료는 왜 존재하나요?">
            <GuideParagraph>
              하나의 블록에 담을 수 있는 거래의 양에는 한계가 있습니다. 그래서 거래를 보낼 때
              수수료를 붙이면, 채굴자는 수수료가 높은 거래를 먼저 블록에 담으려 합니다. 수수료는
              일종의 <HighlightText>우선 처리 요청</HighlightText>인 셈입니다.
            </GuideParagraph>
            <GuideParagraph>
              수수료는 보내는 금액이 아니라 거래 데이터의 크기를 기준으로 매겨지며, 보통{" "}
              <HighlightText>sat/vB</HighlightText>(바이트당 사토시) 단위로 표시합니다. 네트워크가
              혼잡할수록 더 많은 사람이 자리를 차지하려 경쟁해 수수료가 올라갑니다.
            </GuideParagraph>
            <GuideParagraph>
              급하지 않은 거래라면 네트워크가 한산한 시간대에 낮은 수수료로 보내고, 빠른 확정이
              필요하면 높은 수수료를 지불하는 식으로 조절할 수 있습니다. 위의 실시간 트랜젝션 수수료
              정보를 참고하면 적절한 수준을 가늠하는 데 도움이 됩니다.
            </GuideParagraph>
          </GuideSection>
        </div>
      </article>
    </Card>
  );
};

const MemoizedBlocksGuideArticle = memo(BlocksGuideArticle);
MemoizedBlocksGuideArticle.displayName = "BlocksGuideArticle";

export default MemoizedBlocksGuideArticle;
