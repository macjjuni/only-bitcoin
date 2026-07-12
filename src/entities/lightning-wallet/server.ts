/**
 * 서버 전용 공개 API.
 *
 * `api/blink` 는 BLINK_ACCESS_TOKEN 으로 라이트닝 결제를 호출한다.
 * NEXT_PUBLIC_ 접두어가 없어 브라우저에 노출되지 않는 값이므로, 클라이언트
 * 번들에 섞이면 토큰 없이 요청이 나가고 서버 전용 코드가 그대로 실려간다.
 *
 * 따라서 기본 배럴(`index.ts`)을 두지 않고 이 파일로만 노출한다.
 * (`entities/quiz/server.ts` 와 같은 이유, 같은 구조)
 */
export * from "./api/blink";
