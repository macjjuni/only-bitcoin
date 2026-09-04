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
NEXT_PUBLIC_CHAT_WS_URL=ws://localhost:8787/ws
```

## 배포

```bash
pnpm chat:types
pnpm chat:typecheck
pnpm build:chat
pnpm chat:deploy
```

`wrangler secret put`으로 `ACTOR_SECRET`, `ENFORCEMENT_SECRET`, `IP_GUARD_SECRET`, `PASS_SIGNING_SECRET`, `TURNSTILE_SECRET_KEY`, `CF_ACCESS_AUD`를 등록하고, `CHAT_ALLOWED_ORIGINS`, `TURNSTILE_EXPECTED_HOSTNAME`, `ADMIN_EMAIL_ALLOWLIST`는 Worker 변수로 설정합니다. 운영 도메인의 정확한 Origin은 `CHAT_ALLOWED_ORIGINS`에 쉼표로 지정합니다.

Durable Object는 `apac-ne` 위치 힌트로 생성되며, `wrangler.jsonc`의 SQLite migration과 Rate Limit binding을 함께 배포해야 합니다.

## 관리자 API

Cloudflare Access로 보호된 운영 도메인에서만 `/admin/read-only`, `/admin/messages/:id`, `/admin/messages`를 호출합니다. Access JWT의 audience와 이메일 allowlist를 모두 검사합니다.
