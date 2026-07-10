# 아키텍처

이 프로젝트는 **FSD(Feature-Sliced Design)** 를 따른다. 이 문서는 최종 구조와,
코드만 봐서는 알기 어려운 결정들의 이유를 기록한다.

---

## 레이어

```
app/        Next.js App Router. 라우트 진입점, API 라우트, 프로바이더, 이니셜라이저
views/      FSD 의 pages 레이어. 라우트별 화면 조립
widgets/    독립적으로 동작하는 UI 블록
features/   사용자 액션 단위 기능
entities/   도메인 데이터와 상태
shared/     도메인 비의존 공통 코드
```

### `pages` 가 아니라 `views` 인 이유

FSD 표준 이름은 `pages` 지만, Next.js App Router 의 `app/` 과 개념이 겹치고
`pages/` 는 Pages Router 를 연상시킨다. 그래서 `views/` 를 쓴다.

### 의존 규칙

상위 레이어는 하위 레이어만 import 할 수 있다. 반대 방향은 금지다.

```
app > views > widgets > features > entities > shared
```

**이 규칙은 `biome.json` 의 `overrides` 에서 `noRestrictedImports` 로 강제된다.**
위반하면 `pnpm lint` 가 error 로 막는다. 문서에만 적힌 규칙이 아니다.

같은 레이어의 슬라이스끼리도 import 하지 않는다. 현재 `entities` 안의
슬라이스 간 참조는 0건이다.

---

## 슬라이스 공개 API

각 슬라이스는 배럴(`index.ts`)로만 외부에 노출된다. 슬라이스 내부에서 자기
자신을 참조할 때는 **상대 경로**를 쓴다. 자기 배럴을 import 하면 모듈 순환이
생기기 때문이다.

### `client.ts` / `server.ts` 라는 두 번째 진입점

일부 슬라이스는 배럴을 셋으로 나눈다. RSC 경계 때문이다.

| 파일 | 용도 | 예 |
| --- | --- | --- |
| `index.ts` | 서버·클라이언트 공용 (타입, 상수, 스토어) | 전부 |
| `client.ts` | `"use client"` 전용 (훅) | `entities/bitcoin` |
| `server.ts` | 서버 전용 (비밀키를 읽는 API) | `entities/quiz`, `entities/lightning-wallet` |

`server.ts` 는 사고를 겪고 만든 규칙이다. `entities/quiz/index.ts` 가 supabase
클라이언트를 만드는 `api/quiz-rewards` 를 재export 하고 있었는데,
`widgets/surprise-quiz` 가 `"use client"` 컴포넌트면서 그 배럴에서 상수를
가져왔다. `SUPABASE_URL` 은 `NEXT_PUBLIC_` 이 없어 브라우저에 노출되지 않으므로
`createClient(undefined, undefined)` 가 되어 페이지가 통째로 죽었다.

**서버 전용 코드는 절대 기본 배럴에 넣지 않는다.**

---

## 상태 관리

Zustand 스토어를 **소유 레이어별로** 나눈다. 단일 전역 스토어를 두면 최하위
레이어인 `shared` 가 상위 레이어의 슬라이스를 import 할 수밖에 없다.

| 스토어 | 위치 | persist 키 | 내용 |
| --- | --- | --- | --- |
| `useSettingStore` | `shared/stores` | `only-bitcoin` | 테마, 앱 설정 |
| `useBitcoinStore` | `entities/bitcoin` | `only-bitcoin-bitcoin` | 시세, 환율, 거래소 선택 |
| `useBlockStore` | `entities/block` | `only-bitcoin-block` | 블록, 수수료 |
| `useOverviewStore` | `views/overview` | `only-bitcoin-overview` | 차트 선택, 기간, 위젯 순서 |
| `useBtc2FiatStore` | `views/btc2fiat` | `only-bitcoin-btc2fiat` | 변환 계산기 |

각 슬라이스는 `StateCreator<XSlice>` 로 좁게 선언한다. 전체 스토어 타입을
제네릭에 넣으면 슬라이스가 스토어를 import 하게 되어 순환이 생긴다.

### `theme` 은 `only-bitcoin` 최상위에 있어야 한다

`app/layout.tsx` 가 `<head>` 에 블로킹 스크립트를 주입한다. 이 스크립트가 첫
페인트 전에 `localStorage['only-bitcoin']` 을 파싱해 `state.theme` 을 읽고
`<html>` 에 `dark` 클래스를 붙인다. 다크 모드 사용자의 화면 깜빡임(FOUC)을
막기 위한 것이다. 스토어를 더 쪼개더라도 이 위치는 유지해야 한다.

### `shared/stores/legacyMigration.ts` 는 임시 모듈이다

구버전은 모든 상태를 `only-bitcoin` 키 하나에 저장했다. 이 모듈이 v0 데이터를
위 표의 키들로 1회 이관한다. 완료 여부는 persist 봉투의 `version` 필드로
판별한다.

옛 키에 `null` 이나 `"migrated"` 같은 센티널 값을 남기지 않는다. zustand
persist 의 기본 merge 는 `{ ...currentState, ...persistedState }` 얕은 병합이라
저장된 값이 슬라이스 기본값을 덮어쓴다. 센티널을 남기면 롤백 시 구버전 번들이
그 값을 읽다 TypeError 로 죽는다. 키를 지우면 구버전 번들은 기본값으로 안전하게
되돌아간다.

**대부분의 사용자가 최신 버전으로 넘어온 뒤 이 파일과 호출부를 삭제한다.**

---

## 검사

```bash
pnpm lint                    # 레이어 경계 위반 (biome)
node scripts/check-cycles.mjs  # 모듈 순환 참조
```

`check-cycles.mjs` 는 값 import 순환이 하나라도 있으면 exit 1 이다.
`import type` 만으로 이어진 순환은 빌드 시 소거되므로 경고로만 표시하지만,
누군가 값 import 로 바꾸는 순간 런타임 오류가 되므로 함께 본다.

배럴을 경유한 순환이 특히 위험하다. 예를 들어 `shared/config/route.tsx` 는
모듈 최상위에서 `<DashboardIcon />` 같은 JSX 를 즉시 만드는데, `@/shared/ui`
배럴을 경유하면 평가 순서에 따라 아이콘이 `undefined` 인 채로 렌더될 수 있다.
그래서 하위 배럴 `@/shared/ui/icon` 을 직접 가리킨다.
