# 🗺️ FSD 아키텍처 마이그레이션 계획서

본 문서는 **Only ₿itcoin** 프로젝트의 폴더 구조를 **FSD (Feature-Sliced Design)** 구조로 점진적으로 전환하기 위한 마이그레이션 로드맵입니다.

---

## 1. 마이그레이션 전/후 디렉토리 구조 비교

```
[기존 구조]                            [FSD 전환 후 구조 (src/ 하위)]
C:\Users\macjjuni\Documents\git\only-bitcoin
├── app/ (Next.js Routes)             ├── app/ (Next.js Routes - Metadata, entry points)
├── components/                       └── src/
│   ├── common/                           ├── app/ (Providers, Global CSS, Initializer)
│   ├── features/                         ├── pages/ (Page-level View Composers)
│   ├── feedbacks/                        ├── widgets/ (Assembled UI panels/grids)
│   ├── initializer/                      ├── features/ (User Action logic)
│   ├── provider/                         ├── entities/ (Domain concepts & stores)
│   └── ui/                               └── shared/ (Non-business logic, base components)
├── layouts/
└── shared/
    ├── stores/
    ├── hooks/
    └── query/
```

---

## 2. 레이어별 상세 매핑 및 이전 전략

FSD 아키텍처의 핵심 규칙은 **"상위 레이어는 하위 레이어만 참조할 수 있고, 동일 레이어 안에서 슬라이스끼리 직접 참조할 수 없다"**는 것입니다.

### 🧱 2.1 `shared` (공통 인프라)
비즈니스 로직(비트코인, 블록 등)과 전혀 관련이 없는 순수 기술 유틸리티 및 기본 UI 컴포넌트들을 모읍니다.
* **이동 대상:**
  * `components/ui/*` ➔ `src/shared/ui/`
  * `shared/utils/*`, `shared/lib/*` ➔ `src/shared/lib/`
  * `shared/constants/*` (비도메인 상수) ➔ `src/shared/constants/`

### 🩺 2.2 `entities` (비즈니스 엔티티)
비즈니스 핵심 개념(비트코인 가격, 블록 데이터, 퀴즈 모델 등)과 상태(Zustand, React Query)를 정의합니다.
* **슬라이스 구성:**
  * `entities/bitcoin`: 실시간 시세 상태(`bitcoinPrice`), 마켓 차트 쿼리(`useMarketChartQuery.ts`)
  * `entities/block`: 블록 리스트 상태(`blockData`), 수수료 정보(`fees`), 블록 쿼리
  * `entities/quiz`: 퀴즈 질문 타입, 보상 상태
  * `entities/exchange-rate`: 달러 환율 데이터(`exRate`)
* **이동 대상:**
  * `shared/stores/store.ts` ➔ 도메인별로 쪼개어 각 `entities/{slice}/model/` 하위 스토어로 이관
  * `shared/query/*` ➔ 각 도메인에 부합하는 `entities/{slice}/api/`로 이관

### ⚡ 2.3 `features` (사용자 상호작용 및 액션)
사용자가 직접 행하는 비즈니스 가치가 있는 동작이나 상태 변경을 담당합니다.
* **슬라이스 구성:**
  * `features/change-market-currency`: 원화/달러 시세 마켓(업비트/빗썸/바이낸스/코인베이스) 변경 로직
  * `features/convert-btc-fiat`: BTC 계산기 입력값 처리 및 변환 계산기 액션
  * `features/search-transaction`: Mempool 트랜잭션 해시 검색 동작
  * `features/submit-quiz-answer`: 퀴즈 정답 제출 및 라이트닝 보상 토큰 청구(Blink API 연계)
  * `features/toggle-theme`: 다크/라이트 테마 변경

### 🧩 2.4 `widgets` (컴포넌트 조립 레이어)
`entities`와 `features`를 결합하여 화면의 온전한 독립적 블록으로 구성합니다.
* **슬라이스 구성:**
  * `widgets/price-dashboard-panel`: 비트코인 실시간 가격 패널 + 마켓 변경 기능 조합
  * `widgets/mining-metric-chart`: 대시보드 해시레이트/난이도/가격 차트 위젯
  * `widgets/calculator`: 계산기 UI와 환율 변환 피처 조합
  * `widgets/navigation`: 상하단 네비게이션 헤더 및 바 (`layouts/` 컴포넌트 이관)

### 📄 2.5 `pages` (페이지 단위 뷰 조율)
각 라우트의 전체 레이아웃을 잡고 widget들을 조립하는 페이지 컴포넌트입니다.
* **이동 대상:**
  * `components/features/overview/` ➔ `src/pages/overview/`
  * `components/features/blocks/` ➔ `src/pages/blocks/`
  * `components/features/premium/` ➔ `src/pages/premium/`

### 🌐 2.6 `app` (진입점 및 전체 설정)
애플리케이션이 구동되기 위해 필요한 최상위 프로바이더, 웹소켓 이니셜라이저 등을 묶습니다.
* **이동 대상:**
  * `components/initializer/Initializer.tsx` ➔ `src/app/providers/` 혹은 `src/app/index.tsx`
  * `app/globals.css` ➔ `src/app/styles/globals.css`
  * **Next.js `app/` 라우터 폴더(예: `app/overview/page.tsx`)**는 데이터 Fetching 및 메타데이터 정의 후 `src/pages/overview`를 단순히 임포트하여 반환하는 **Thin Page** 역할로 축소됩니다.

---

## 3. 슬라이스 내 세그먼트 구성 예시 (`entities/bitcoin` 기준)

각 슬라이스는 다음과 같이 기술적 세그먼트로 나뉘며, 반드시 **Public API (`index.ts`)**를 통해 외부와 통신해야 합니다.

```
src/entities/bitcoin/
├── ui/                 # 비트코인 가격 컴포넌트 (예: PriceTicker.tsx)
├── model/              # Zustand 스토어 (예: bitcoinStore.ts)
├── api/                # React Query 훅 및 WebSocket 훅
├── lib/                # 비트코인 가격 포맷터 등 내부 헬퍼
└── index.ts            # Public API (외부로 노출할 요소만 export)
```

### 📝 Public API (`index.ts`) 작성 규칙
```typescript
// 외부 슬라이스에서는 오직 이 index.ts를 통해서만 접근 가능
export { PriceTicker } from "./ui/PriceTicker";
export { useBitcoinStore } from "./model/bitcoinStore";
export { useUpbitSocket } from "./api/useUpbitSocket";
export type { BitcoinPriceTypes } from "./model/types";
```
이로 인해 다른 슬라이스에서 `entities/bitcoin/ui/PriceTicker`로 직접 접근하는 것이 금지되고 `entities/bitcoin` 형태로만 접근하게 되어 내부 변경 사항이 캡슐화됩니다.


---

## 5. UI 컴포넌트 FSD 마이그레이션 상세 매핑 가이드

FSD 아키텍처에서 UI 컴포넌트는 **비즈니스 결합도**와 **재사용 단위**에 따라 명확히 수직 분할되어야 합니다.

### 🗺️ UI 컴포넌트 재배치 매핑표

| 기존 컴포넌트 경로 | FSD 변경 후 레이어/슬라이스 | 역할 설명 |
| :--- | :--- | :--- |
| `components/ui/*` | `src/shared/ui/*` | 특정 비즈니스 데이터가 들어가지 않는 순수 원자성 컴포넌트 (Button, Input 등) |
| `components/common/*` | `src/shared/ui/layout/*` 또는 `widgets/` | 도메인 독립적인 전역 레이아웃 요소 또는 공통 셸 컴포넌트 |
| `components/features/overview/pricePanel` | `src/widgets/price-dashboard-panel/` | 실시간 시세(`entities`)와 거래소 변경(`features`)이 결합된 독립적인 복합 패널 |
| `components/features/blocks/TxSearcher.tsx` | `src/features/search-transaction/` | 사용자의 검색 입력 및 버튼 인터랙션을 포함하는 피처 컴포넌트 |
| `components/feedbacks/surpriseQuiz/` | `src/widgets/surprise-quiz-modal/` | 퀴즈 정보(`entities/quiz`)와 제출 액션(`features/submit-quiz`)이 조립된 모달 위젯 |

---

## 6. 구체적인 컴포넌트 해체 및 조립 예시

### 1) 퀴즈 모달 (`SurpriseQuiz.tsx`) 마이그레이션 예시
- **기존 구조:** `components/feedbacks/surpriseQuiz/SurpriseQuiz.tsx`가 모달 UI, 퀴즈 노출, 정답 타이핑 입력 및 검증, Supabase/Blink 보상 지급 트랜잭션을 한 몸에 처리.
- **FSD 분해 방식:**
  * 🔴 **Shared:** `src/shared/ui/modal/` (기본 모달 프레임 UI)
  * 🟡 **Entities:** `src/entities/quiz/ui/QuizQuestion.tsx` (단순히 질문 및 보기 텍스트를 렌더링하는 순수 뷰)
  * 🟢 **Features:** `src/features/submit-quiz-answer/` (입력값 유효성 검사 및 정답 제출/보상 청구 트랜잭션 전송 버튼)
  * 🔵 **Widgets:** `src/widgets/surprise-quiz-modal/` (위 세 가지 요소를 수입하여 조립한 최종 위젯)

### 2) 대시보드 시세 패널 (`pricePanel`) 마이그레이션 예시
- **기존 구조:** `components/features/overview/pricePanel` 하위에 실시간 가격 수치 표시 및 업비트/빗썸/바이낸스/코인베이스 선택 기능이 혼재.
- **FSD 분해 방식:**
  * 🟡 **Entities:** `src/entities/bitcoin/ui/PriceTicker.tsx` (스토어에서 실시간으로 받아온 `bitcoinPrice` 가격 수치를 카운트업 애니메이션과 함께 그리는 역할)
  * 🟢 **Features:** `src/features/change-market-currency/` (거래소 선택 SelectBox 컴포넌트 및 마켓 변경 액션 트리거)
  * 🔵 **Widgets:** `src/widgets/price-dashboard-panel/` (PriceTicker와 MarketSelector를 수입하여 하나의 대시보드 위젯으로 결합)

---

## 7. 마이그레이션 3단계 로드맵

1. **1단계: Infrastructure 격리 (Shared & App)**
   - `shared` 유틸 폴더와 `kku-ui`, 글로벌 스타일/프로바이더를 FSD 규격으로 이동하여 기본 토대를 다집니다.
2. **2단계: 도메인 격리 (Entities & Features)**
   - 거대한 단일 Zustand 스토어(`shared/stores/store.ts`)를 `bitcoinStore`, `blockStore`, `settingsStore` 등 독립 도메인 단위로 파편화하여 `entities/`에 안착시킵니다.
   - 각 페이지에 복잡하게 얽혀 있던 사용자 인터랙션 로직을 `features/` 단위로 묶어 슬라이스화합니다.
3. **3단계: 조립 및 이관 (Widgets & Pages & Thin Routing)**
   - 기존 컴포넌트를 `widgets`와 `pages`로 분리하여 레이아웃을 리팩토링합니다.
   - Next.js의 `app/` 폴더를 단순 라우팅 및 껍데기 역할로 전환합니다.


---

## 8. 페이지별 마이그레이션 진행 상황 (Status Dashboard)

각 라우트 페이지별 FSD 마이그레이션 목표 경로와 현재 진행 상황을 추적하는 대시보드입니다.

| 페이지명 | 기존 경로 | FSD 목표 페이지 경로 | 핵심 이관 위젯 / 피처 | 마이그레이션 상태 |
| :--- | :--- | :--- | :--- | :--- |
| **대시보드 (Overview)** | `app/overview/` | `src/pages/overview/` | `widgets/price-dashboard-panel`<br>`widgets/mining-metric-chart` | ⬜ 대기 |
| **블록 현황 (Blocks)** | `app/blocks/` | `src/pages/blocks/` | `widgets/mempool-visualizer`<br>`widgets/block-tx-fees` | ⬜ 대기 |
| **계산기 (Btc2Fiat)** | `app/btc2fiat/` | `src/pages/btc2fiat/` | `widgets/btc-calculator`<br>`features/convert-btc-fiat` | ⬜ 대기 |
| **프리미엄 (Premium)** | `app/premium/` | `src/pages/premium/` | `widgets/premium-dashboard`<br>`entities/exchange-rate` | ⬜ 대기 |
| **설정 (Settings)** | `app/settings/` | `src/pages/settings/` | `widgets/settings-form`<br>`features/toggle-theme` | ⬜ 대기 |
| **오렌지필 메인 (Orange Pill)** | `app/orange-pill/` | `views/orange-pill/` | `widgets/orange-pill-content` | ✅ 완료 |
| **BIP39 검색 (Bip39)** | `app/orange-pill/bip39/` | `views/bip39/` | `entities/bip39` | ✅ 완료 |
| **밈 다운로드 (Meme)** | `app/orange-pill/meme/` | `views/meme/` | `entities/meme`<br>`features/download-meme` | ✅ 완료 |

> [!TIP]
> - 마이그레이션 진행 시 상태 컬럼을 `⬜ 대기` ➔ `🔄 진행 중` ➔ `✅ 완료` 단계로 업데이트하며 추적합니다.
> - 특정 페이지 마이그레이션 시 관련 entities와 features가 먼저 구성되어 있어야 합니다.
