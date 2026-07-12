/**
 * 서버 전용 공개 API.
 *
 * `api/quiz-rewards` 는 모듈 최상위에서 supabase 클라이언트를 생성하고,
 * 그 클라이언트는 `SUPABASE_URL` / `SUPABASE_ANON_KEY` 를 요구한다. 두 값 모두
 * `NEXT_PUBLIC_` 접두어가 없어 브라우저에 노출되지 않으므로, 클라이언트 번들에
 * 섞이면 `supabaseUrl is required` 로 즉시 터진다.
 *
 * 따라서 기본 배럴(`index.ts`)에서는 노출하지 않는다. 클라이언트 컴포넌트가
 * `@/entities/quiz` 에서 상수만 가져가도 서버 코드가 딸려오지 않도록 하기 위함이다.
 * (`client.ts` 로 클라이언트 전용 API를 나누는 다른 엔티티들과 대칭 구조)
 */
export * from "./api/quiz-rewards";
