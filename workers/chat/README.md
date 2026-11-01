# 익명 채팅·BTC 스페이스 Worker

Cloudflare Worker와 별도 Durable Object(`ChatRoom`, `SpaceRoom`)로 운영하는 only-bitcoin 채팅·3D 공간 서버입니다. 기존 채팅은 `/v1/chat/ws`, 공간은 `/v1/space/ws`를 사용합니다.

## 로컬 실행

```bash
pnpm install
pnpm chat:dev
```

`pnpm chat:dev`는 `workers/chat/.dev.vars`의 빠진 로컬 키 네 개와 localhost/127.0.0.1 Origin을 자동으로 준비합니다. 기존 설정과 키는 유지하고, 생성한 파일은 Git에서 제외합니다. 이 준비 과정은 배포 명령에는 실행되지 않습니다. 공간의 위치·채팅 테스트에는 Turnstile·Google OAuth 설정이 필요 없습니다. 기존 전체 채팅의 인증·관리자 기능까지 확인하려면 `.dev.vars.example`의 나머지 값을 설정합니다.

프론트엔드 `.env.local`에 다음 공개 URL을 설정하고 개발 서버를 재시작합니다.

```env
NEXT_PUBLIC_CHAT_API_URL=http://localhost:8787
NEXT_PUBLIC_CHAT_WS_URL=ws://localhost:8787/v1/chat/ws
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=replace-with-google-oauth-client-id.apps.googleusercontent.com
```

다른 터미널에서 `pnpm dev`를 실행하고 `http://localhost:3002/space`를 일반 창과 시크릿 창에서 엽니다. 같은 일반 브라우저의 탭끼리는 identity를 공유하므로 앞 탭의 연결이 교체됩니다.

두 서버를 실행해도 재연결이 반복되면 Worker 터미널에서 비밀키 누락 오류를 먼저 확인합니다. `IP_GUARD_SECRET`이 없으면 WebSocket 업그레이드 전에 HMAC 오류가 나고, `ENFORCEMENT_SECRET`이 없으면 입장을 완료하지 못합니다. `pnpm chat:dev`를 다시 실행하면 누락된 로컬 키가 준비됩니다.

공간은 같은 `NEXT_PUBLIC_CHAT_WS_URL`의 호스트·포트·프로토콜을 재사용하고 경로만 `/v1/space/ws`로 바꿉니다. 별도 공간 URL 환경변수는 없습니다.

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

`v1`은 기존 `ChatRoom`, `v2`는 새 SQLite-backed `SpaceRoom` namespace를 등록합니다. `SPACE_ROOM`은 별도 바인딩이며, SQLite backend를 사용해도 공간 위치·채팅 본문을 SQL에 기록하지 않습니다. `worker-configuration.d.ts`에는 두 namespace의 생성 타입이 포함됩니다. 런타임 타입 생성용 로컬 포트가 차단된 환경에서는 `pnpm chat:types --include-runtime=false`로 바인딩 타입만 생성하고 설치된 `@cloudflare/workers-types`를 사용합니다.

## 공간 연결·비용 구조

- 좌석은 50개입니다. 서버가 좌석·아바타 색·초기 위치를 배정하고, 접속 중인 같은 clientKey가 재접속하면 기존 좌석·위치를 새 소켓에 넘깁니다. 구소켓에는 `SESSION_REPLACED`와 close `4001`을 보내므로 클라이언트는 자동 재접속을 중단해야 합니다.
- 입장 대기는 최대 10개, 전체 소켓은 최대 60개, IP guard별 연결은 최대 20개입니다. 입장 프레임을 10초 안에 보내지 않으면 종료합니다. 두 경로 모두 기존 Origin allowlist와 IP upgrade limiter(경로별 30회/60초)를 통과해야 합니다.
- 클라이언트는 15초마다 JSON이 아닌 원문 `ping`을 보내고 원문 `pong`을 처리합니다. `setWebSocketAutoResponse`가 유휴 ping에 응답하므로 이 keepalive는 공간 DO를 깨우지 않습니다.
- 이동이 들어오면 변경 좌석만 모아 100ms 후 바이너리 프레임 한 장으로 전원에게 보냅니다. 프레임 하나는 헤더 8B + 좌석당 7B이며 최대 358B입니다. 변경분이 없으면 타이머·스냅샷·SQL 쓰기가 없습니다. 입장·퇴장·말풍선은 JSON 이벤트입니다.
- 연결 메타데이터와 최종 위치는 `serializeAttachment`로 보관하고 hibernation 복귀 때 roster를 복원합니다. 채팅 본문은 attachment에도 저장하지 않으며 이전 말풍선을 재생하지 않습니다.
- 종료 이벤트로 깨어났을 때 종료 소켓이 이미 연결 목록에서 빠져 있어도 callback attachment로 `leave`를 보냅니다. callback attachment도 사라진 드문 경계 조건에서는 살아 있는 사용자에게 전체 roster를 `welcome`으로 한 번 재동기화합니다. 같은 좌석에 새 연결이 있으면 오래된 소켓의 종료 이벤트로 퇴장시키지 않습니다.
- 유령 연결은 실제 입장·이동 이벤트가 있을 때 정리합니다. 마지막 정상 동작과 런타임 자동 pong 시각이 모두 60초 넘게 오래된 연결만 회수합니다. 유휴 정리를 위한 반복 타이머나 alarm은 없습니다.

## 공간 입력·말풍선 제한

공간은 PWA 전용·Turnstile 쓰기 인증을 요구하지 않습니다. `ChatRoom`의 관리자 삭제와 읽기 전용 kill switch도 공간에 적용되지 않습니다. 같은 익명 identity를 공유해도 독립 공간이므로 자체 Origin/IP·프레임·본문 제한을 적용합니다. 공간 말풍선 관리가 필요해지면 별도 관리자 경로가 필요합니다.

- JSON 프레임 상한은 UTF-8 8KiB, 소켓당 입력은 초당 40개입니다. 잘못된 버전·바이너리 상향·유한하지 않은 좌표는 종료합니다.
- 이동은 70ms보다 빠르면 버립니다. 월드 경계와 8.5m/s 이동 예산(클라이언트 달리기 8m/s + 전송 여유)을 검증하고 yaw를 정규화합니다. 긴 백그라운드 간격은 경과 시간만큼 예산을 회복하므로 정상 복귀 이동을 차단하지 않습니다. 거절 시 서버의 `peer` 상태를 송신자에게 보내 보정합니다.
- 닉네임과 본문은 기존 `normalizeNickname`/`normalizeChatMessage`를 재사용합니다. 닉네임 8글자, 공간 채팅 본문 100 grapheme, 링크·연락처 제한과 선정성 필터가 적용됩니다. 같은 연결의 말풍선은 3초에 한 번만 허용합니다.
- 최근 32개 `rid`의 ID·본문 SHA-256·시각만 attachment에 남깁니다. 같은 `rid`/본문을 다시 받으면 송신자에게만 같은 메시지를 echo하고 다른 사람에게 재전송하지 않습니다. 본문이 다른 `rid` 재사용은 거절합니다.
- 쿨다운·중복 방지는 **살아 있는 연결 세션** 기준입니다. hibernation과 기존 소켓을 대체하는 중복 접속에서는 유지됩니다. 이전 소켓이 완전히 끝난 뒤의 새 연결에서는 초기화됩니다. 클라이언트는 전송 결과가 불확실한 말풍선을 자동으로 재전송하지 않습니다.

## 공간 검증

```bash
pnpm exec vitest run workers/chat
pnpm chat:typecheck
pnpm build:chat
```

유닛 테스트는 Durable Object state·WebSocket을 모의해 좌석 상한, 재접속 교체, dirty 배치, 이동 보정, attachment 복원, 쿨다운·중복 요청, 유휴 pong, 입장 제한과 ingress 보안을 확인합니다. `build:chat`은 Worker 번들 dry run이며 실제 배포·브라우저 간 WebSocket 통합 검증을 대신하지 않습니다.

Cloudflare API 근거: [Hibernation WebSocket API](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), [자동 응답·시각 API](https://developers.cloudflare.com/durable-objects/api/state/#setwebsocketautoresponse), [유휴 상태·타이머와 hibernation](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/).

## 관리자 API

관리자 요청은 `Authorization: Bearer <Google ID Token>` 헤더를 사용합니다. Worker는 Google 서명, issuer, audience, 만료 시간과 이메일 검증 여부를 확인한 뒤 `ADMIN_EMAIL_ALLOWLIST`에 등록된 계정만 허용합니다.
