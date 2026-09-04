# 익명 실시간 채팅 Worker

Cloudflare Worker와 Durable Object(`ChatRoom`)로 운영하는 only-bitcoin 채팅 서버입니다.

## 로컬 실행

```bash
pnpm install
pnpm chat:dev
```

`.dev.vars`에 `.dev.vars.example`의 비밀값을 채우고, 프론트엔드 `.env.local`에 다음 공개 URL을 설정합니다.

```env
NEXT_PUBLIC_CHAT_API_URL=http://localhost:8787
NEXT_PUBLIC_CHAT_WS_URL=ws://localhost:8787/v1/chat/ws
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=replace-with-google-oauth-client-id.apps.googleusercontent.com
```

Google Cloud Console의 웹 OAuth 클라이언트에는 로컬 `http://localhost:3002`와 운영 사이트 Origin을 승인된 JavaScript 원본으로 등록합니다. 프론트엔드와 Worker에는 같은 Google OAuth client ID를 설정합니다.

## 배포

```bash
pnpm chat:types
pnpm chat:typecheck
pnpm build:chat
pnpm chat:deploy
```

`wrangler secret put`으로 `ACTOR_SECRET`, `ENFORCEMENT_SECRET`, `IP_GUARD_SECRET`, `PASS_SIGNING_SECRET`, `TURNSTILE_SECRET_KEY`, `GOOGLE_OAUTH_CLIENT_ID`를 등록하고, `CHAT_ALLOWED_ORIGINS`, `TURNSTILE_EXPECTED_HOSTNAME`, `ADMIN_EMAIL_ALLOWLIST`는 Worker 변수로 설정합니다. 운영 도메인의 정확한 Origin은 `CHAT_ALLOWED_ORIGINS`에 쉼표로 지정합니다.

Durable Object는 `apac-ne` 위치 힌트로 생성되며, `wrangler.jsonc`의 SQLite migration과 Rate Limit binding을 함께 배포해야 합니다.

## 관리자 API

관리자 요청은 `Authorization: Bearer <Google ID Token>` 헤더를 사용합니다. Worker는 Google 서명, issuer, audience, 만료 시간과 이메일 검증 여부를 확인한 뒤 `ADMIN_EMAIL_ALLOWLIST`에 등록된 계정만 허용합니다.
