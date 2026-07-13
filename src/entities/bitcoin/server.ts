/**
 * 서버 전용 공개 API.
 *
 * SSR 초기값 조회 fetch 모듈(`*.server`)만 노출한다. 서버 컴포넌트에서만 호출되며,
 * 클라이언트 번들에 섞이지 않도록 기본 배럴(`index.ts`)과 분리한다.
 * 타입은 `model/types` 에 있으므로 클라이언트 컴포넌트는 `@/entities/bitcoin` 에서 가져간다.
 * (`client.ts` 로 클라이언트 전용 훅을 나누는 것과 대칭 구조)
 */
export { fetchInitialMacro } from "./api/macro.server";
export { fetchInitialPrice } from "./api/price.server";
