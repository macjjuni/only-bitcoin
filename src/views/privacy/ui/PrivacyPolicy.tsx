import type { ReactNode } from "react";
import { PRIVACY_EFFECTIVE_DATE_LABEL } from "@/shared/constants/policy";
import { Card, CollapseSection, HighlightText } from "@/shared/ui";

// region [Constants]
const SERVICE_DOMAIN = "only-btc.app";
const FEEDBACK_URL = process.env.NEXT_PUBLIC_FEEDBACK_URL || "https://x.com/a7w2en7z_";

const GOOGLE_AD_SETTINGS_URL = "https://myadcenter.google.com/";
const GOOGLE_AD_POLICY_URL = "https://policies.google.com/technologies/ads";
const GOOGLE_ANALYTICS_OPT_OUT_URL = "https://tools.google.com/dlpage/gaoptout";

/** 서비스가 시세·지표를 조회하는 외부 데이터 출처. */
const DATA_SOURCES = [
  "비트코인 시세: Upbit, Bithumb, Binance, Coinbase",
  "도미넌스(BTC.D): CoinGecko",
  "공포·탐욕 지수: alternative.me",
  "원/달러 환율: Naver(KEB)",
  "블록·트랜잭션 정보: mempool.space",
];
// endregion

// region [Privates]
interface PolicySectionTypes {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

const PolicySection = ({ title, defaultOpen = false, children }: PolicySectionTypes) => (
  <CollapseSection
    title={<h2 className="m-0 text-base font-bold">{title}</h2>}
    defaultOpen={defaultOpen}
    className="border-b-[0.75px] border-neutral-300 dark:border-neutral-600 last:border-none"
    summaryClassName="py-4 text-base"
    contentClassName="flex flex-col gap-3 pb-5"
  >
    {children}
  </CollapseSection>
);

const PolicyParagraph = ({ children }: { children: ReactNode }) => (
  <p className="text-sm opacity-90 leading-relaxed">{children}</p>
);

const PolicyList = ({ items }: { items: readonly string[] }) => (
  <ul className="flex flex-col gap-1.5 pl-4">
    {items.map((item) => (
      <li key={item} className="list-disc text-sm opacity-90 leading-relaxed">
        {item}
      </li>
    ))}
  </ul>
);

const PolicyLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="underline underline-offset-2 break-all"
  >
    {children}
  </a>
);
// endregion

const PrivacyPolicy = () => {
  return (
    <Card className="w-full">
      <article className="flex flex-col gap-2 p-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-[18px] font-bold">개인정보처리방침</h1>
          <p className="text-sm opacity-80 leading-relaxed">
            온리 비트코인({SERVICE_DOMAIN})은 회원가입 없이 이용할 수 있으며, 이용자의 개인정보를
            서버에 수집·저장하지 않습니다. 아래는 서비스가 사용하는 쿠키, 광고, 외부 데이터에 대한
            안내입니다.
          </p>
          <p className="text-xs opacity-60">시행일: {PRIVACY_EFFECTIVE_DATE_LABEL}</p>
        </header>

        <div className="flex flex-col">
          <PolicySection title="1. 개인정보 보호 개요" defaultOpen>
            <PolicyParagraph>
              본 서비스는 이용자의 별도 회원가입 절차가 없으며, 이름·이메일·연락처·자산 정보 등
              어떠한 <HighlightText>개인정보도 서버에 수집하거나 저장하지 않는 것</HighlightText>을
              원칙으로 합니다.
            </PolicyParagraph>
            <PolicyParagraph>
              따라서 서비스 이용을 위해 별도의 개인정보 수집 동의를 받지 않으며, 이용자를 식별할 수
              있는 계정이나 프로필도 생성하지 않습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              다만 서비스 제공 과정에서 아래와 같이 브라우저에 저장되는 정보와, 광고·분석 목적으로
              제3자가 수집하는 정보가 있을 수 있으므로 이를 투명하게 고지합니다.
            </PolicyParagraph>
          </PolicySection>

          <PolicySection title="2. 브라우저에 저장되는 정보 (쿠키·로컬 저장소)">
            <PolicyParagraph>
              본 서비스는 이용 편의를 위해 다음 정보를 이용자{" "}
              <HighlightText>기기의 브라우저에만</HighlightText> 저장하며, 이 정보는 서버로 전송되지
              않습니다.
            </PolicyParagraph>
            <PolicyList
              items={[
                "로컬 저장소(localStorage): 테마(라이트/다크), 표시 통화 단위 등 사용자 설정과 시세·블록 데이터 캐시",
                "쿠키(Cookie): 앱 설치(PWA) 안내 노출 여부, 공지 확인 여부",
              ]}
            />
            <PolicyParagraph>
              위 정보는 이용자를 식별하는 용도로 사용되지 않으며, 브라우저 설정에서 쿠키와 사이트
              데이터를 삭제하면 언제든지 함께 제거됩니다.
            </PolicyParagraph>
          </PolicySection>

          <PolicySection title="3. 구글 애드센스 광고 및 쿠키 고지">
            <PolicyParagraph>
              본 서비스는 서비스 운영 및 지속적인 품질 개선을 위해 구글(Google Inc.)이 제공하는 웹
              광고 서비스인 <HighlightText>구글 애드센스(Google AdSense)</HighlightText>를
              사용합니다.
            </PolicyParagraph>
            <PolicyParagraph>
              구글을 포함한 제3자 광고 제공업체는 이용자의 이전 방문 기록 및 웹사이트 이용 행태를
              기반으로 최적화된 맞춤형 광고를 게재하기 위해 쿠키(Cookie)를 사용할 수 있습니다.
              구글의 광고 쿠키 사용에 대한 자세한 내용은{" "}
              <PolicyLink href={GOOGLE_AD_POLICY_URL}>구글 광고 정책</PolicyLink>에서 확인할 수
              있습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              이용자는 맞춤형 광고 표시를 원치 않을 경우{" "}
              <PolicyLink href={GOOGLE_AD_SETTINGS_URL}>구글 광고 설정 페이지</PolicyLink>에서
              맞춤형 광고를 차단하거나, 웹 브라우저의 옵션 설정을 통해 쿠키 수집을 거부할 수
              있습니다. 쿠키 수집을 거부하더라도 서비스의 기본 기능은 정상적으로 이용할 수 있습니다.
            </PolicyParagraph>
          </PolicySection>

          <PolicySection title="4. 이용 통계 분석 (구글 애널리틱스)">
            <PolicyParagraph>
              본 서비스는 방문 통계 파악과 서비스 개선을 위해{" "}
              <HighlightText>구글 애널리틱스(Google Analytics)</HighlightText>를 사용합니다. 이
              과정에서 페이지 조회 기록, 접속 기기 및 브라우저 종류 등 개인을 식별할 수 없는 형태의
              이용 행태 정보가 수집될 수 있습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              수집된 정보는 통계 목적으로만 활용되며, 이를 통해 특정 개인을 식별하거나 별도의
              개인정보와 결합하지 않습니다. 분석 도구의 수집을 원치 않는 경우{" "}
              <PolicyLink href={GOOGLE_ANALYTICS_OPT_OUT_URL}>
                구글 애널리틱스 차단 브라우저 부가기능
              </PolicyLink>
              을 설치해 거부할 수 있습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              또한 서비스가 배포된 호스팅 환경에서는 안정적인 운영과 장애 대응을 위해 접속 기록(IP
              주소, 접속 시각 등)이 일시적으로 기록될 수 있으며, 이는 서비스 운영 목적 외로 이용되지
              않습니다.
            </PolicyParagraph>
          </PolicySection>

          <PolicySection title="5. 데이터 및 API 활용 안내">
            <PolicyParagraph>
              본 서비스가 제공하는 시세, 거래소 프리미엄(Premium), 도미넌스(BTC.D), 공포·탐욕
              지수(F&amp;G Index), 블록 정보 등은 공개 API 및 국내외 거래소의 실시간 데이터를
              기반으로 조회·연동됩니다.
            </PolicyParagraph>
            <PolicyList items={DATA_SOURCES} />
            <PolicyParagraph>
              이 과정에서 이용자의{" "}
              <HighlightText>
                거래소 계정 권한(API Key)이나 자산 데이터를 요구하지 않으며
              </HighlightText>
              , 서버로 전송하거나 보관하지도 않습니다. 모든 데이터는 공개된 시장 정보만을 조회하는
              방식으로 제공됩니다.
            </PolicyParagraph>
          </PolicySection>

          <PolicySection title="6. 만 14세 미만 아동의 개인정보">
            <PolicyParagraph>
              본 서비스는 만 14세 미만 아동을 대상으로 하지 않으며, 아동의 개인정보를 의도적으로
              수집하지 않습니다. 서비스 특성상 별도의 회원가입이나 개인정보 입력 절차가 존재하지
              않습니다.
            </PolicyParagraph>
          </PolicySection>

          <PolicySection title="7. 투자 면책 조항 (Disclaimer)">
            <PolicyParagraph>
              본 서비스가 제공하는 모든 비트코인 관련 시세 정보 및 온체인 지표는{" "}
              <HighlightText>투자 참고용 데이터</HighlightText>일 뿐이며, 어떠한 경우에도 투자
              권유나 금융 자문을 구성하지 않습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              실시간 API 연동 과정에서 데이터 지연이나 미세한 오차가 발생할 수 있으며, 본 서비스는
              제공된 정보의 정확성이나 이를 바탕으로 행해진 투자 결과(손실 등)에 대해 어떠한 법적
              책임도 지지 않습니다. 투자에 대한 최종 판단과 책임은 이용자 본인에게 있습니다.
            </PolicyParagraph>
          </PolicySection>

          <PolicySection title="8. 방침 변경 및 문의">
            <PolicyParagraph>
              본 개인정보처리방침의 내용이 추가·삭제 또는 수정될 경우, 변경 사항을 본 페이지를 통해
              고지합니다. 변경된 방침은 게시한 시점부터 적용됩니다.
            </PolicyParagraph>
            <PolicyParagraph>
              개인정보 처리 및 서비스에 대한 문의 사항은{" "}
              <PolicyLink href={FEEDBACK_URL}>운영자 채널</PolicyLink>을 통해 접수해 주시기
              바랍니다.
            </PolicyParagraph>
          </PolicySection>
        </div>
      </article>
    </Card>
  );
};

export default PrivacyPolicy;
