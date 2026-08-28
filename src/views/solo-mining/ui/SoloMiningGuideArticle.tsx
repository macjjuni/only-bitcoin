import { GuideArticle, GuideParagraph, GuideSection, GuideWarningBox } from "@/shared/ui";

/** 검색 유입을 위한 설명 섹션. 서버 컴포넌트로 두어 HTML 에 그대로 포함되게 한다. */
export default function SoloMiningGuideArticle() {
  return (
    <GuideArticle title="솔로 마이닝 확률은 어떻게 계산하나요?" className="w-full">
      <GuideSection title="난이도 기준으로 계산합니다">
        <GuideParagraph>
          블록 하나를 찾으려면 평균적으로 <b>난이도 × 2³²</b> 번의 해시를 시도해야 합니다. 여기에 내
          해시레이트를 나누면 블록 1개까지의 평균 소요 시간이 나옵니다. 네트워크 해시레이트는 관측된
          블록 생성 시간에서 역산한 추정치라 단기 변동이 크지만, 난이도는 프로토콜이 확정한 값이라
          계산 기준으로 더 정확합니다.
        </GuideParagraph>
      </GuideSection>

      <GuideSection title="기간별 확률은 포아송 분포를 씁니다">
        <GuideParagraph>
          블록 발견은 서로 독립적인 사건이라 기대 발견 횟수를 λ 라 할 때 해당 기간에 최소 1개를 찾을
          확률은 <b>1 - e^(-λ)</b> 입니다. 확률을 두 배 기간으로 늘려도 두 배가 되지 않는
          이유입니다.
        </GuideParagraph>
      </GuideSection>

      <GuideSection title="평균과 중앙값은 다릅니다">
        <GuideParagraph>
          소요 시간은 지수분포를 따르므로 중앙값은 평균의 약 0.693배입니다. &ldquo;평균 100년&rdquo;
          은 100년을 채워야 캔다는 뜻이 아니라, 절반은 69년 안에 캐고 나머지는 그보다 오래 걸린다는
          뜻입니다.
        </GuideParagraph>
      </GuideSection>

      <GuideSection title="풀 마이닝과 무엇이 다른가요?">
        <GuideParagraph>
          솔로 마이닝은 블록을 찾으면 보조금과 수수료를 전부 가져가지만, 못 찾으면 아무 것도 얻지
          못합니다. 기대 수익의 총합은 풀 마이닝과 비슷하고 분산만 극단적으로 커지는 구조라 흔히
          복권에 비유합니다.
        </GuideParagraph>
      </GuideSection>

      <GuideWarningBox title="면책 안내">
        <p className="text-sm leading-relaxed text-foreground">
          이 계산기는 난이도가 고정되어 있다고 가정한 이론값입니다. 실제 난이도는 약 2주마다
          조정되고 장비 성능·가동률도 변하므로 투자 판단의 근거로 삼지 마세요.
        </p>
      </GuideWarningBox>
    </GuideArticle>
  );
}
