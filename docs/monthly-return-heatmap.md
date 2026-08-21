# 월별 등락률 히트맵 — 개발 계획

> 작성일: 2026-08-21
> 상태: **계획 검토 중** (구현 착수 전)
> 레퍼런스: [btc.coinsect.io/contents/bitcoin-cagr](https://btc.coinsect.io/contents/bitcoin-cagr) 하단 "월별 등락률" 섹션

---

## 1. 개요

### 1.1 한 줄 정의

세로축 연도 · 가로축 월로 **비트코인 월별 등락률**을 격자에 깔고, 값에 따라 붉게/푸르게 칠하는 히트맵.

### 1.2 확정된 결정

| 항목 | 결정 | 근거 |
| --- | --- | --- |
| 배치 | 신규 라우트 `/cagr` | 원본과 대응. 후속으로 CAGR 히트맵·계산기를 같은 페이지에 얹기 좋음 |
| 기준 통화 | **USD** | 원본과 동일 범위(2010-08~). KRW(빗썸)는 2013-12부터라 4개 연도 행이 날아감 |
| 데이터 소스 | blockchain.com `charts/market-price` | 레포에 이미 폴백 호출 코드가 있어 재사용 가능 |
| 렌더링 | **HTML `<table>` + Tailwind** | 아래 1.3 참고 |

### 1.3 ApexCharts를 안 쓰는 이유

`plotOptions.heatmap.colorScale.gradientLegend`를 검토했고 **기술적으로는 가능**함.
다만 5.16.0 번들 소스를 확인한 결과 두 가지가 막힘.

- **`연간` 열을 무채색으로 못 둠** — `determineColor()`가 셀 색을 `colorScale.ranges` 아니면 시리즈 색에서만 뽑음. 데이터포인트 단위 `fillColor`를 안 읽어서, 같은 히트맵 안에서 한 열만 색을 빼는 게 불가능함.
- **모바일 가로 스크롤이 안 됨** — Apex는 컨테이너 폭에 12열을 욱여넣음. 360px 화면에서 셀 하나가 24px라 `+12%` 라벨이 안 들어감. 원본이 `min-width:44px` + `overflow-x:auto` + 연도 열 `sticky`로 푼 문제인데 Apex에선 sticky 축을 포기해야 함.

부수적으로 `gradientLegend`는 apexcharts **5.14.0**부터라 현재 `5.6.0`을 올려야 함. table로 가면 이 업그레이드도 불필요함.
그라데이션 범례 자체는 `linear-gradient` 한 줄로 동일하게 재현함.

---

## 2. 원본 스펙 (번들 역추출 결과)

이 절은 구현의 정답지임. 값·색·포맷이 여기서 벗어나면 "똑같이"가 아님.

### 2.1 값 계산

```
셀(연도 Y, 월 M) = close[Y-M] / close[전월] - 1        // 1월의 전월은 (Y-1)-12
연간(연도 Y)      = close[Y의 마지막 달] / close[(Y-1)-12] - 1
```

- `close`는 **그 달의 종가**(= 그 달 마지막 거래일 가격).
- 어느 한쪽이 없으면 `null` → 빈 셀.
- 연간 열은 12칸을 복리로 곱한 것과 같은 값이라 **범위가 달라서 색을 안 칠함**. 원본 설명문에 명시돼 있음.

### 2.2 색 (5단계 이산화)

```
domain = 40          // ±40%에서 최대 농도
step(v):
  v가 0이거나 유한하지 않으면 → 0
  sign  = v < 0 ? -1 : 1
  ratio = min(|v| / domain, 1)
  return sign * max(1, ceil(ratio * 5))     // -5..-1, 0, 1..5
```

- 농도 = `|step| / 5` → 0.2 / 0.4 / 0.6 / 0.8 / 1.0
- `step > 0` 초록, `step < 0` 빨강, `step === 0` 무색
- 원본 토큰: up `#24cc64`(다크 `#12994c`), down `#ff2020`
  → 레포의 `--up-rgb`(`#22c55e`) / `--down-rgb`(`#ef4444`)로 대체함. 이미 Tailwind `up`/`down` 색으로 등록돼 있고 알파 변형(`bg-up/60`)이 열려 있음.

### 2.3 포맷

```
`${v > 0 ? '+' : ''}${v.toFixed(Math.abs(v) < 10 ? 1 : 0)}%`
```

10% 미만은 소수 1자리, 이상은 정수. 양수에만 `+`. (음수는 `-`가 이미 붙음)

### 2.4 레이아웃

- `<table>`, `border-spacing: 2px`, `font-size: 11px`, `tabular-nums`
- 셀 `min-width: 44px`, 가운데 정렬, `border-radius: 3px`
- 좌측 연도 열은 `position: sticky; left: 0` + 불투명 배경
- 바깥은 `overflow-x: auto`
- 결측 셀은 45° 스트라이프
- 하단 범례: 좌우 캡 `-40%` / `+40%`

---

## 3. 데이터 계층

### 3.1 소스 확인 결과

`https://api.blockchain.info/charts/market-price?timespan=1year&start=YYYY-01-01&format=json&cors=true`

- 요청당 366건 **일별**로 내려옴. (`timespan=all`은 4일 간격이라 월말 종가를 못 집음 — 반드시 연 단위로 끊어야 함)
- **2010-08-17까지는 `y: 0`으로 내려옴.** 첫 유효값은 `2010-08-18: 0.07`.
  → `y > 0` 필터가 필수. 안 걸면 2010-08 종가가 0이 되고 2010-09 등락률이 `Infinity`가 됨.
- 2010~현재 = 17회 요청.

### 3.2 모듈

```
src/entities/bitcoin/lib/btcMonthlyUsd.ts          # 순수 모듈 (Next 비의존)
src/entities/bitcoin/lib/btcMonthlyUsd.test.ts
src/entities/bitcoin/api/btcMonthlyUsd.server.ts   # unstable_cache 래퍼
```

`lib` / `api.server` 분리는 기존 `btcDailyKrw` 짝과 동일한 구조임.

```ts
/** 'YYYY-MM' → 그 달의 BTC 달러 종가 */
export type BtcMonthlyUsdMap = ReadonlyMap<string, number>;

export async function fetchBtcMonthlyUsdMap(now?: Date): Promise<BtcMonthlyUsdMap>;
```

- 연도별로 순차 호출하며 `y > 0`인 날만 `YYYY-MM` 키에 덮어씀. 날짜 오름차순이므로 마지막에 남는 값이 곧 그 달의 종가임.
- `fetchJsonWithRetry`(3회, 지수 백오프)는 `btcDailyKrw.ts`에 있는 것과 같은 정책. **공용화하지 말고 각자 두는 게 나음** — 지금 붙였다가 한쪽 재시도 정책만 바꿔야 할 때 서로 발목 잡음.
- **한 해라도 실패하면 던짐.** 부분 Map을 돌려주면 그 해 1월 셀이 조용히 `null`이 되거나, 더 나쁘게는 직전 존재하는 달과 비교돼 **틀린 등락률**이 나옴. `btcDailyKrw`가 같은 이유로 던지는 구조를 그대로 따름.

### 3.3 캐시 — 2계층

이 페이지는 **셀 값이 전부 서버에서 확정되고 상호작용이 없으므로 통째로 정적 HTML로 굽는 게 맞음.** ISR로 굽고, 재생성 비용은 데이터 캐시로 깎음.

| 계층 | 대상 | 시간 | 이유 |
| --- | --- | --- | --- |
| **ISR** (`export const revalidate`) | `/cagr` HTML | **6시간** = `21600` | 진행 중인 달 셀만 움직이고 그것도 하루 단위 폭임. 그보다 잦게 구울 이유가 없음 |
| `unstable_cache` | **확정 연도** (`year < 현재 연도`) | **30일** = `2592000` | 그 해 월별 종가는 다시 안 바뀜. 사실상 영구고, 30일은 소스가 과거값을 정정했을 때 흡수하는 용도 |
| `unstable_cache` | **진행 중 연도** | **6시간** = `21600` | ISR 주기와 **같은 값**. 아래 참고 |

> **구현하며 정정한 부분** — 계획 초안은 "안쪽 캐시가 ISR 주기보다 짧아야 재생성 때 새 값을 집어온다"는 이유로 진행 중 연도를 1시간으로 잡았음. 실제로는 **Next 가 라우트의 revalidate 를 `page.tsx` 값과 그 안에서 쓰인 캐시 TTL 중 최솟값으로 클램프함.** 1시간으로 두니 `page.tsx` 에 21600 을 적어도 `next build` 의 Revalidate 열이 `1h` 로 찍혔음. 즉 두 값은 독립된 계층이 아니라 **작은 쪽이 페이지 주기를 그대로 결정함.** 그래서 둘을 6시간으로 맞췄고, 지금은 빌드 결과가 `6h` 로 나옴. 한쪽만 바꾸면 조용히 다른 쪽이 무시되므로 양쪽 주석에 서로를 가리키는 문구를 남겨 뒀음.

**연도별로 캐시를 쪼개는 이유** — 통째로 하나의 `unstable_cache`에 넣으면 6시간마다 업스트림 17회가 나감(하루 68회). 연도별로 나누면 확정 연도 16개는 30일간 안 움직이고 **진행 중인 1개만 재요청**돼서 재생성당 1회로 떨어짐. `btcDailyKrw.server.ts`의 `resolveRevalidateSeconds(year)`가 같은 이유로 이미 이 구조임.

```ts
const DAYS_30_IN_SECONDS = 60 * 60 * 24 * 30;
const HOUR_1_IN_SECONDS = 60 * 60;

/** 진행 중인 연도는 그 해 마지막 달 종가가 계속 갱신되므로 재검증 주기를 짧게 잡음. */
function resolveRevalidateSeconds(year: number): number {
  if (year >= new Date().getUTCFullYear()) {
    return HOUR_1_IN_SECONDS;
  }

  return DAYS_30_IN_SECONDS;
}

/** 연도별로 캐시하고 합쳐서 돌려줌. */
export async function getBtcMonthlyUsdMap(): Promise<BtcMonthlyUsdMap>;
```

- 태그는 `["btc-monthly-usd"]`로 통일. 소스 정정 등으로 손으로 비워야 할 때 `revalidateTag`로 전 연도를 한 번에 날림.
- `Map`은 직렬화가 안 되므로 배열로 넣었다 되돌림 (`getBtcDailyKrwMap`과 동일한 처리).
- `unstable_cache`는 함수가 던지면 아무것도 보관하지 않음 → **부분적으로 채워진 결과가 캐시에 굳을 일이 없음.** 3.2의 "한 해라도 실패하면 던짐" 정책이 여기서 값을 함.
- 확정 연도가 30일 캐시라 **아카이브 스크립트는 만들지 않음.** 전체가 17회 요청 · 190여 개 숫자라 아파트(구당 152회)와 규모가 다름.
  → 빌드 타임 생성 부하나 콜드 스타트가 실측에서 문제되면 그때 `scripts/build-btc-monthly-archive.ts`를 추가함. (`build-apartment-archive.ts`가 선례)

### 3.4 배럴

`src/entities/bitcoin/server.ts`에 추가:

```ts
export { type BtcMonthlyUsdMap, getBtcMonthlyUsdMap } from "./api/btcMonthlyUsd.server";
```

---

## 4. 도메인 로직 (순수 함수)

표현에 종속된 집계라 `entities`가 아니라 `views/cagr/lib`에 둠. (`views/btc2apartment/lib/buildChartSeries.ts`와 같은 위치 감각)

```
src/views/cagr/lib/buildMonthlyReturnGrid.ts
src/views/cagr/lib/buildMonthlyReturnGrid.test.ts
src/views/cagr/lib/heatLevel.ts
src/views/cagr/lib/heatLevel.test.ts
```

### 4.1 `buildMonthlyReturnGrid`

```ts
interface MonthlyReturnRow {
  year: number;
  /** 1~12월. 값이 없으면 null */
  monthlyReturnRates: (number | null)[];
  /** 전년 12월 종가 대비 그 해 마지막 종가. 색은 안 칠함 */
  annualReturnRate: number | null;
}

export function buildMonthlyReturnGrid(monthlyCloseMap: BtcMonthlyUsdMap): MonthlyReturnRow[];
```

- 행은 Map에 존재하는 최소 연도 ~ 최대 연도 오름차순. 2010이 맨 위.
- 진행 중인 연도는 아직 안 온 달이 `null`이라 자동으로 빈 셀이 됨.

**테스트 케이스**

- 1월 셀이 전년 12월 종가를 분모로 쓰는지
- 전년 12월이 없는 첫 해(2010) 1월이 `null`인지
- 중간 달이 비면 그 달과 다음 달 **둘 다** `null`인지
- 연간 열이 "그 해 마지막으로 존재하는 달"을 분자로 쓰는지 (진행 중 연도)
- 종가 0이 섞여 들어와도 `Infinity`가 안 나오는지 (3.1의 2010-08 케이스)

### 4.2 `heatLevel`

```ts
export const HEAT_DOMAIN_PERCENT = 40;
export const HEAT_STEPS = 5;

/** -5..5. 0은 무색 */
export function resolveHeatLevel(returnRate: number | null): number;

/** Tailwind JIT가 스캔할 수 있도록 클래스 문자열을 리터럴로 매핑 */
export function resolveHeatClassName(returnRate: number | null): string;

export function formatReturnRate(returnRate: number): string;
```

**클래스 매핑은 반드시 리터럴 테이블로 둠.** `` `bg-up/${alpha}` `` 같은 문자열 조립은 Tailwind가 못 잡아내서 프로덕션 빌드에서 색이 통째로 날아감.

```ts
const HEAT_CLASS_NAME_BY_LEVEL: Record<number, string> = {
  [-5]: "bg-down",
  [-4]: "bg-down/80",
  [-3]: "bg-down/60",
  [-2]: "bg-down/40",
  [-1]: "bg-down/20",
  0: "",
  1: "bg-up/20",
  2: "bg-up/40",
  3: "bg-up/60",
  4: "bg-up/80",
  5: "bg-up",
};
```

`null`은 `heat-empty`(스트라이프)로 따로 분기함.

---

## 5. UI

### 5.1 클라이언트 JS가 필요 없음

셀 값·색이 전부 서버에서 확정되고, 다크모드는 `--up-rgb`/`--down-rgb` 토큰이 CSS만으로 처리함.
호버·스크롤도 CSS라 **`"use client"` 없이 순수 RSC로 렌더함.** 클라이언트 번들 증가 0.

```
src/views/cagr/ui/CagrScreen.tsx            # 서버 컴포넌트. 데이터 조회 + 섹션 조립
src/views/cagr/ui/MonthlyReturnHeatmap.tsx  # 서버 컴포넌트. table 렌더
src/views/cagr/ui/HeatmapLegend.tsx         # 그라데이션 범례
src/views/cagr/index.ts
```

### 5.2 마크업 골격

```tsx
<div className="overflow-x-auto">
  <table className="w-full border-separate border-spacing-[2px] text-[11px] tabular-nums font-number">
    <caption className="sr-only">비트코인 월별 등락률</caption>
    <thead>
      <tr>
        <th className="sticky left-0 …">연도</th>
        {/* 1~12 */}
        <th className="border-l …">연간</th>
      </tr>
    </thead>
    <tbody>{/* 연도 행 */}</tbody>
  </table>
</div>
```

- 연도 `<th>`는 `sticky left-0` + **불투명 배경**(`bg-neutral-100 dark:bg-neutral-900`).
  `bg-background`를 쓰면 안 됨 — `globals.css`에 `.glass-surface [class~="bg-background"] { background-color: transparent; }` 규칙이 있어서 카드 안에서는 투명해짐.
- **스크롤 컨테이너에 좌우 패딩을 주면 안 됨.** `-mx-2 px-2`로 시작했다가 스크롤 시 고정된 연도 열 왼쪽 8px 패딩 영역으로 셀 색이 비쳐 보였음. `sticky left-0`은 패딩 안쪽 가장자리에 붙는데 스크롤되는 셀은 패딩 영역까지 지나가기 때문. `-mx-2`만 남기고 `px-2`를 뺌.
- 연간 열은 색 없이 `font-bold` + `border-l`.
- 각 `<td>`에 `title={`${연도} ${월}월 · ${포맷값}`}`로 툴팁. 모바일에선 안 뜨지만 데스크톱·스크린리더에 유효함.

### 5.3 globals.css 추가

Tailwind 임의값으로 쓰기엔 쉼표가 많아 유틸 하나를 뺌.

```css
/* 데이터 없는 달. 0%와 구분되어야 하므로 무채색 대신 스트라이프로 표시함. */
.heat-empty {
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 3px,
    rgb(0 0 0 / 0.05) 3px,
    rgb(0 0 0 / 0.05) 6px
  );
}
.dark .heat-empty { /* 밝은 스트라이프로 뒤집음 */ }
```

### 5.4 범례

원본은 11칸 스와치지만, 연속 그라데이션 띠로 감. (요청 맥락 반영)

```tsx
<div className="flex items-center gap-1">
  <span>-40%</span>
  <div
    className="h-2.5 flex-1 rounded-sm"
    style={{
      background:
        "linear-gradient(to right, rgb(var(--down-rgb)), rgb(var(--down-rgb)/0.1), rgb(var(--up-rgb)/0.1), rgb(var(--up-rgb)))",
    }}
  />
  <span>+40%</span>
</div>
```

### 5.5 상태 표시

- 데이터 조회 실패 → "시세 데이터를 불러오지 못했어요" 문구. 페이지 전체를 죽이지 않음.
  **단, 3.3의 ISR과 맞물리는 지점이 있음.** 조회가 던지면 Next는 재생성에 실패한 것으로 보고 **직전에 성공한 정적 HTML을 계속 서빙함**(stale-while-revalidate). 즉 업스트림이 죽어도 사용자는 6시간 전 히트맵을 그대로 봄. 실패 문구가 실제로 보이는 건 **한 번도 성공한 적 없을 때**뿐임 — 이게 우리가 원하는 동작이라 별도 폴백을 두지 않음.
- 로딩은 `app/cagr/loading.tsx`로 스켈레톤. ISR로 구워진 뒤엔 거의 안 보이고, 최초 요청·빌드 폴백에서만 뜸.
  **여기서 kku-ui 컴포넌트를 쓰면 안 됨.** `loading.tsx`는 서버 컴포넌트인데 kku-ui는 모듈 최상단에서 `createContext`를 불러서 `TypeError: m.createContext is not a function`으로 프리렌더가 깨짐(`KSpinner`로 시도했다가 빌드 실패). 스켈레톤은 CSS만으로 충분해 클라이언트 경계를 만들 이유도 없음.
- 섹션 설명문은 원본 뉘앙스를 살림: *"각 칸은 전월 종가 대비 변화율임. 연간 열은 값의 범위가 달라 색을 칠하지 않았음."*

---

## 6. 라우트 · SEO

| 파일 | 작업 |
| --- | --- |
| `src/app/cagr/page.tsx` | `metadata`(title/description/canonical/OG/twitter) + `export const revalidate` + `<CagrScreen />`. `btc2apartment/page.tsx`가 템플릿 |
| `src/app/cagr/loading.tsx` | 스켈레톤 |

```tsx
// src/app/cagr/page.tsx
/**
 * 6시간마다 재생성함. 진행 중인 달 셀만 움직이므로 이보다 잦을 이유가 없음.
 * 값을 줄일 거면 `api/btcMonthlyUsd.server.ts` 의 진행 중 연도 TTL(1시간)도
 * 같이 내려야 함 — 그게 더 길어지면 재생성해도 같은 값을 다시 굽게 됨.
 */
export const revalidate = 21600;
```

**`revalidate` 는 리터럴 숫자로 씀.** `60 * 60 * 6` 처럼 계산식으로 두면 Next 정적 분석이 못 읽고 빌드가 깨질 수 있음. 대신 주석으로 단위를 남김.

이 페이지는 동적 API(`cookies`·`headers`·`searchParams`)를 안 건드리므로 빌드 타임에 한 번 구워지고 이후 ISR로 굴러감. 빌드 때 업스트림 17회가 나가는데, 확정 연도 16개는 그 시점에 30일 캐시로 들어가므로 이후 재생성은 1회씩만 나감.
| `src/shared/config/route.tsx` | `{ title: "월별 등락률", path: "/cagr", isNav: false, isFavorite: false }` 추가. **배열 인덱스 순서가 화면 전환 방향을 정하므로** 위치에 주의 |
| `src/app/sitemap.ts` | `staticRoutes`에 `"/cagr"` 추가 |
| `src/views/orange-pill/ui/OrangePillContent.tsx` | "유틸리티" 그룹에 진입 `ListRow` 추가. `/dca`·`/btc2apartment`처럼 nav에 없는 페이지는 여기가 유일한 발견 경로임 |

OG 이미지(`public/app/og-image-cagr.webp`)는 없으면 기본값으로 두고 후속에 채움.

---

## 7. 작업 순서

1. **데이터** — `lib/btcMonthlyUsd.ts` + 테스트 → `api/btcMonthlyUsd.server.ts` → `server.ts` 배럴
2. **로직** — `heatLevel.ts` + 테스트 → `buildMonthlyReturnGrid.ts` + 테스트
3. **UI** — `globals.css` 유틸 → `HeatmapLegend` → `MonthlyReturnHeatmap` → `CagrScreen`
4. **연결** — `page.tsx` / `loading.tsx` / `route.tsx` / `sitemap.ts` / `OrangePillContent`
5. **검증** — `pnpm test` · `pnpm check` · `pnpm check:cycles` · `pnpm build` · 실기기 폭 확인(360px)

1~2는 UI 없이 테스트로 닫히므로 여기서 값이 맞는지 먼저 확정하고 3으로 넘어감.

---

## 8. 검증 체크리스트

- [ ] 2010년 행: 1~8월 스트라이프, 9월부터 값
- [ ] 2010-08 종가가 `0`이 아니라 `0.07`대 (3.1의 필터가 동작)
- [ ] 각 해 1월 셀이 전년 12월 대비인지 표본 검산 (예: 2013-01)
- [ ] 진행 중인 연도의 미래 달이 스트라이프, 연간 열은 그 시점까지의 누적
- [ ] `연간` 열에 배경색이 없음
- [ ] 360px 폭에서 가로 스크롤 + 연도 열 고정 동작, 셀 텍스트 안 깨짐
- [ ] 라이트/다크 양쪽에서 5단계 농도가 구분되고, 최대 농도 셀의 글자가 읽힘
- [ ] 프로덕션 빌드(`pnpm build`)에서 `bg-up/40` 계열이 안 날아감 — **4.2의 리터럴 매핑이 실제로 지켜졌는지 확인하는 항목임**
- [ ] `pnpm build` 로그에서 `/cagr` 가 `●` (SSG, ISR) 로 잡힘 — `ƒ` (동적) 이면 어딘가에서 동적 API를 건드린 것
- [ ] 빌드 중 업스트림 요청이 17회, 곧바로 다시 빌드하면 확정 연도가 캐시를 타는지 (`.next/cache` 유지 시)
- [ ] `revalidate` 리터럴이 빌드 경고 없이 통과

---

## 9. 이번 스코프에서 뺀 것

- **CAGR 히트맵 · 기간 슬라이더 계산기** — 원본 상단부. `/cagr`라는 라우트명은 이걸 나중에 같은 페이지에 얹을 걸 전제로 정한 것임. 이번엔 월별 등락률 섹션만 올라감.
- **KRW 토글** — 빗썸 월봉을 붙이면 되지만 2014년 이전이 비어 표가 짝이 안 맞음. 수요 확인 후 판단.
- **셀 클릭 인터랙션** — 원본은 CAGR 히트맵에만 있음. 월별 히트맵은 클릭 동작이 없어 RSC 유지 가능.
