import type { ReactNode } from "react";
import { env, SERVICE_DOMAIN } from "@/shared/config/env";
import { PRIVACY_EFFECTIVE_DATE_LABEL } from "@/shared/constants/policy";
import { Card, CollapseSection, HighlightText } from "@/shared/ui";

// region [Constants]
const FEEDBACK_URL = env.NEXT_PUBLIC_FEEDBACK_URL;

const GOOGLE_AD_SETTINGS_URL = "https://myadcenter.google.com/";
const GOOGLE_AD_POLICY_URL = "https://policies.google.com/technologies/ads";
const GOOGLE_ANALYTICS_OPT_OUT_URL = "https://tools.google.com/dlpage/gaoptout";
const GOOGLE_PRIVACY_POLICY_URL = "https://policies.google.com/privacy";
const CLOUDFLARE_PRIVACY_POLICY_URL = "https://www.cloudflare.com/privacypolicy/";
const VERCEL_PRIVACY_POLICY_URL = "https://vercel.com/legal/privacy-notice";

/** 서비스가 시세·지표를 조회하는 외부 데이터 출처. */
const DATA_SOURCES = [
  "비트코인 시세(실시간): Upbit, Bithumb, Binance, Coinbase",
  "비트코인 시세(과거 BTC/USD): blockchain.com",
  "도미넌스(BTC.D): CoinGecko",
  "공포·탐욕 지수: alternative.me",
  "비트코인 현물 ETF 자금 흐름: Xoomar(xoomar.com)",
  "미국 M2 통화량: FRED(미국 세인트루이스 연방준비은행, M2SL 시리즈)",
  "원/달러 환율: Naver(KEB)",
  "블록·트랜잭션 정보: mempool.space",
  "아파트 실거래가: 국토교통부 공공데이터(data.go.kr)",
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
    <Card className="w-full font-pretendard">
      <article className="flex flex-col gap-2 p-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-[18px] font-bold">개인정보처리방침</h1>
          <p className="text-sm opacity-80 leading-relaxed">
            온리 비트코인({SERVICE_DOMAIN})은 회원가입 없이 이용할 수 있습니다. 서비스 제공에 필요한
            브라우저 저장 정보, 온라인 식별 정보, 채팅 데이터와 제3자 처리 내용을 아래와 같이
            안내합니다.
          </p>
          <p className="text-xs opacity-60">시행일: {PRIVACY_EFFECTIVE_DATE_LABEL}</p>
          <aside className="mt-2 rounded-xl border border-bitcoin/25 bg-bitcoin/5 p-3">
            <p className="text-xs font-bold">주요 변경 사항</p>
            <p className="mt-1 text-xs leading-5 opacity-80">
              2026년 9월 6일: 실시간 공개 채팅의 처리 항목, 메시지 보관·삭제·복구 기준, 외부 서비스
              및 국외 처리, 만 14세 미만 채팅 이용 제한 내용을 추가했습니다.
            </p>
          </aside>
        </header>

        <div className="flex flex-col">
          <PolicySection title="1. 개인정보 보호 개요" defaultOpen>
            <PolicyParagraph>
              본 서비스는 별도 회원가입 절차가 없으며 일반 이용자에게 이름·이메일·비밀번호·거래소
              계정 정보나 자산 정보를 요구하지 않습니다. 다만 공개 채팅 제공과 부정이용 방지를 위해
              채팅 식별 정보와 이용자가 작성한 내용을 처리합니다.
            </PolicyParagraph>
            <PolicyParagraph>
              광고·분석 도구와 배포·보안 인프라가 별도의 정보를 처리할 수 있으며, 구체적인 항목과
              보관 범위는 아래에서 설명합니다.
            </PolicyParagraph>
          </PolicySection>

          <PolicySection title="2. 브라우저에 저장되는 정보 (쿠키·로컬 저장소)">
            <PolicyParagraph>
              본 서비스는 이용 편의와 채팅 세션 유지를 위해 다음 정보를 이용자 기기의 브라우저에
              저장합니다. 채팅 식별 정보와 닉네임, 보안 토큰은 채팅 연결과 검증 과정에서 서버로
              전송됩니다.
            </PolicyParagraph>
            <PolicyList
              items={[
                "로컬 저장소(localStorage): 테마(라이트/다크), 표시 통화 단위 등 사용자 설정과 시세·블록 데이터 캐시",
                "DCA 매매 기록: 이용자가 DCA 페이지에 직접 입력한 매수·매도 수량·단가·날짜·메모 및 목표 수량 (로컬 저장소에만 저장)",
                "쿠키(Cookie): 앱 설치(PWA) 안내 노출 여부, 공지 확인 여부, 시작 화면으로 지정한 페이지 경로 (최대 400일, 만료 또는 삭제 후 브라우저 설정에 따라 다시 생성될 수 있음)",
                "채팅 로컬 저장소: 채팅 식별용 임의 키, 닉네임, 안내 확인 및 이용 상태, 부정이용 방지용 보안 토큰",
              ]}
            />
            <PolicyParagraph>
              위 정보는 갱신되거나 이용자가 브라우저의 쿠키와 사이트 데이터를 삭제할 때까지 유지될
              수 있습니다. 채팅 식별 정보가 삭제되면 새로운 표시 신원으로 참여하게 되며, 채팅
              메시지와 반응 목록은 브라우저 로컬 저장소에 영구 보관하지 않습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              채팅 쓰기 권한은 발급 후 최대 24시간 유효합니다. 부정이용 방지용 보안 토큰은
              유효기간이 지나더라도 갱신되거나 이용자가 브라우저의 사이트 데이터를 삭제할 때까지
              기기에 남을 수 있습니다.
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
              있습니다. 이 경우 맞춤형 광고 등 일부 기능이 제한될 수 있습니다.
            </PolicyParagraph>
          </PolicySection>

          <PolicySection title="4. 이용 통계 분석 (구글 애널리틱스)">
            <PolicyParagraph>
              본 서비스는 방문 통계 파악과 서비스 개선을 위해{" "}
              <HighlightText>구글 애널리틱스(Google Analytics)</HighlightText>를 사용합니다. 이
              과정에서 페이지 조회 기록, 접속 기기와 브라우저 종류, 접속 정보 등의 이용 행태 정보가
              처리될 수 있습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              수집된 정보는 방문 통계와 서비스 개선 목적으로 이용합니다. 분석 도구의 수집을 원치
              않는 경우{" "}
              <PolicyLink href={GOOGLE_ANALYTICS_OPT_OUT_URL}>
                구글 애널리틱스 차단 브라우저 부가기능
              </PolicyLink>
              을 설치해 거부할 수 있습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              또한 서비스가 배포된 호스팅 환경에서는 안정적인 운영과 장애 대응을 위해 접속 기록(IP
              주소, 접속 시각 등)이 일시적으로 기록될 수 있습니다. 해당 정보는 서비스 운영, 보안,
              부정이용 방지, 장애 대응 및 법령상 의무 이행을 위해 처리될 수 있습니다.
            </PolicyParagraph>
          </PolicySection>

          <PolicySection title="5. 실시간 공개 채팅 데이터 처리">
            <PolicyParagraph>
              설치한 PWA에서 공개 채팅을 이용하면 채팅 제공과 부정이용 방지를 위해 닉네임,
              메시지·답글·반응, 채팅 식별 정보 및 접속·보안 정보를 처리합니다.
            </PolicyParagraph>
            <PolicyParagraph>
              닉네임, 채팅 표시 ID, 메시지, 답글, 반응 및 작성 시각은 채팅에 참여한 다른 이용자에게
              공개됩니다. 공개를 원하지 않는 개인정보, 연락처 또는 민감한 정보는 입력하지 않아야
              하며, 채팅에는 비공개 게시 기능이 없습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              채팅 메시지는 일정한 기간이 아니라 최신 300개까지만 보관합니다. 새 메시지 등록으로
              300개를 초과하면 가장 오래된 메시지부터 자동으로 삭제됩니다. 일반 이용자는 작성한
              메시지를 직접 수정하거나 삭제할 수 없으며, 관리자는 운영정책 준수, 서비스 보호 또는
              법령상 의무 이행을 위해 필요하다고 판단하는 경우 사전 통지 없이 삭제할 수 있습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              원문 메시지가 300개 제한으로 자동 삭제되더라도, 해당 메시지를 인용한 답글에는 작성
              당시 닉네임, 채팅 표시 ID와 원문 일부(최대 36자)가 남으며 해당 답글이 삭제될 때 함께
              삭제됩니다. 관리자가 원문을 삭제한 경우 인용 본문은 즉시 제거되지만, 당시 닉네임과
              채팅 표시 ID는 해당 답글이 삭제될 때까지 남을 수 있습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              삭제된 메시지는 복구 기능을 제공하지 않으며 개별 복구 요청도 지원하지 않습니다. 다만
              삭제된 정보는 Cloudflare의 재해 복구 기록에 최대 30일간 남을 수 있습니다. 운영자는
              해당 기록을 이용자 요청에 따른 개별 메시지 복구에 사용하지 않으며, 서비스 복구, 보안
              대응 및 법령상 의무 이행 등 필요한 범위에서 처리할 수 있습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              채팅 연결 과정에서 IP 주소와 브라우저·기기 관련 정보가 보안 및 부정이용 방지를 위해
              처리될 수 있으나, 서비스의 채팅 데이터베이스에는 원본 IP 주소를 저장하지 않습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              서버의 연결 상태는 채팅에 연결된 동안 유지됩니다. 별도로 저장된 단기 이용 상태는
              마지막 연결 또는 닉네임 변경 이후 정기 정리 일정에 따라 최대 약 48시간 남을 수 있으며,
              메시지와 답글에 포함된 닉네임·채팅 표시 ID 및 반응 정보는 해당 메시지 또는 답글의 보관
              기준을 따릅니다.
            </PolicyParagraph>
          </PolicySection>

          <PolicySection title="6. 외부 서비스 및 국외 처리">
            <PolicyParagraph>
              서비스 제공을 위해 다음 외부 업체가 필요한 정보를 처리할 수 있습니다.
            </PolicyParagraph>
            <PolicyList
              items={[
                "Cloudflare, Inc.(미국): 실시간 채팅 전송·저장, 보안 및 봇 방지 / 채팅 데이터, 채팅 식별 정보, 접속·보안 정보",
                "Vercel, Inc.(미국): 웹사이트 호스팅·전송, 보안 및 장애 대응 / IP 주소, 접속 시각, 브라우저·기기 및 요청 정보",
                "Google LLC(미국): 광고 제공 및 이용 통계 분석 / 쿠키, 페이지 이용 기록, 브라우저·기기 및 접속 정보",
              ]}
            />
            <PolicyParagraph>
              위 정보는 서비스 이용 시 인터넷을 통해 실시간 또는 자동으로 전송되며, 미국 및 각
              업체가 인프라를 운영하는 국가에서 목적 달성에 필요한 기간 동안 처리될 수 있습니다.
              채팅 메시지는 제5항의 기준을 따르며, 그 밖의 정보는 각 업체의 서비스 운영·보안 및 로그
              정책에 따라 보관됩니다.
            </PolicyParagraph>
            <PolicyParagraph>
              국외 처리를 원하지 않는 이용자는 채팅을 이용하지 않거나 브라우저 및 광고 설정에서
              쿠키·분석 처리를 제한할 수 있습니다. Cloudflare 처리를 거부하면 채팅 이용이, Vercel
              처리를 거부하면 웹사이트 이용이 제한될 수 있습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              자세한 내용은{" "}
              <PolicyLink href={CLOUDFLARE_PRIVACY_POLICY_URL}>
                Cloudflare 개인정보처리방침
              </PolicyLink>
              , <PolicyLink href={VERCEL_PRIVACY_POLICY_URL}>Vercel 개인정보처리방침</PolicyLink>,{" "}
              <PolicyLink href={GOOGLE_PRIVACY_POLICY_URL}>Google 개인정보처리방침</PolicyLink>에서
              확인할 수 있습니다.
            </PolicyParagraph>
          </PolicySection>

          <PolicySection title="7. 데이터 및 API 활용 안내">
            <PolicyParagraph>
              본 서비스가 제공하는 시세, 거래소 프리미엄(Premium), 도미넌스(BTC.D), 공포·탐욕
              지수(F&amp;G Index), 블록 정보, 비트코인 현물 ETF 자금 흐름, 미국 M2 통화량 등은 공개
              API 및 국내외 거래소·기관의 데이터를 기반으로 조회·연동됩니다.
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
            <PolicyParagraph>
              이용자가 DCA(적립식 매수) 기능에 직접 입력하는 매수·매도 기록 역시 이용자 기기의
              브라우저에만 저장되며, 서버로 전송하거나 보관하지 않습니다.
            </PolicyParagraph>
          </PolicySection>

          <PolicySection title="8. 만 14세 미만 아동의 개인정보">
            <PolicyParagraph>
              본 서비스는 만 14세 미만 아동을 대상으로 하지 않으며, 아동의 개인정보를 의도적으로
              수집하지 않습니다. 만 14세 미만 이용자는 채팅 기능을 이용할 수 없으며, 채팅 참여 전
              본인이 만 14세 이상임을 확인해야 합니다.
            </PolicyParagraph>
          </PolicySection>

          <PolicySection title="9. 투자 면책 조항 (Disclaimer)">
            <PolicyParagraph>
              본 서비스가 제공하는 모든 비트코인 관련 시세 정보 및 온체인 지표는{" "}
              <HighlightText>투자 참고용 데이터</HighlightText>일 뿐이며, 어떠한 경우에도 투자
              권유나 금융 자문을 구성하지 않습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              실시간 API 연동 과정에서 데이터 지연이나 미세한 오차가 발생할 수 있으며, 본 서비스는
              관계 법령이 허용하는 범위에서 제공된 정보의 정확성이나 이를 바탕으로 행해진 투자
              결과(손실 등)에 대해 책임을 지지 않습니다. 투자에 대한 최종 판단과 책임은 이용자
              본인에게 있습니다.
            </PolicyParagraph>
          </PolicySection>

          <PolicySection title="10. 이용자 권리, 방침 변경 및 문의">
            <PolicyParagraph>
              이용자는 관계 법령에 따라 개인정보의 열람, 정정·삭제 및 처리정지를 요청할 수 있습니다.
              권리 행사는 아래 운영자 채널을 통해 접수할 수 있습니다. 요청 처리를 위해 본인과 대상
              정보를 확인할 수 있으며, 구체적인 처리 여부와 방법은 관계 법령에서 정한 범위와 절차를
              따릅니다. 채팅에는 이용자가 메시지를 직접 수정하거나 삭제하는 기능이 제공되지
              않습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              개인정보 보호 및 고충처리 담당은 온리 비트코인 운영자이며, 개인정보 처리와 관련한
              문의와 권리 요청은 <PolicyLink href={FEEDBACK_URL}>운영자 채널</PolicyLink>을 통해
              접수할 수 있습니다.
            </PolicyParagraph>
            <PolicyParagraph>
              본 개인정보처리방침의 내용이 추가·삭제 또는 수정될 경우, 변경 사항을 본 페이지를 통해
              고지하고 시행일을 표시합니다. 법령상 사전 고지가 필요한 변경은 정해진 기간 전에
              알립니다.
            </PolicyParagraph>
          </PolicySection>
        </div>
      </article>
    </Card>
  );
};

export default PrivacyPolicy;
