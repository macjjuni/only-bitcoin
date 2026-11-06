# BTC 스페이스 Worker

Cloudflare Worker와 Durable Object(`SpaceRoom`)로 운영하는 only-bitcoin 3D 공간 서버입니다. 공간은 `/v1/space/ws`를 사용합니다.

익명 공개 채팅(`ChatRoom`, `/v1/chat/*`, `/v1/admin/*`)은 종료했습니다. `v3` migration이 `ChatRoom`과 그 저장 데이터를 삭제합니다. Worker·변수 이름의 `chat`은 운영 설정을 다시 등록하지 않으려고 그대로 둔 것입니다.

## 로컬 실행

```bash
pnpm install
pnpm chat:dev
```

`pnpm chat:dev`는 `workers/chat/.dev.vars`의 빠진 로컬 키 두 개(`ENFORCEMENT_SECRET`, `IP_GUARD_SECRET`)와 localhost/127.0.0.1 Origin, 로컬 공간 IP 연결 제한 해제 설정을 자동으로 준비합니다. 기존 설정과 키는 유지하고, 생성한 파일은 Git에서 제외합니다. 이 준비 과정은 배포 명령에는 실행되지 않습니다.

프론트엔드 `.env.local`에 다음 공개 URL을 설정하고 개발 서버를 재시작합니다.

```env
NEXT_PUBLIC_CHAT_WS_URL=ws://localhost:8787/v1/space/ws
```

다른 터미널에서 `pnpm dev`를 실행하고 `http://localhost:3002/space`를 일반 창과 시크릿 창에서 엽니다. 같은 일반 브라우저의 탭끼리는 identity를 공유하므로 로컬에서는 앞 탭의 연결이 교체됩니다. 운영에서는 IP당 2개 연결 제한이 적용되고, 같은 identity의 두 번째 연결은 입장할 때 앞 연결을 닫고 좌석을 물려받습니다.

두 서버를 실행해도 재연결이 반복되면 Worker 터미널에서 비밀키 누락 오류를 먼저 확인합니다. `IP_GUARD_SECRET`이 없으면 WebSocket 업그레이드 전에 HMAC 오류가 나고, `ENFORCEMENT_SECRET`이 없으면 입장을 완료하지 못합니다. `pnpm chat:dev`를 다시 실행하면 누락된 로컬 키가 준비됩니다.

공간은 같은 `NEXT_PUBLIC_CHAT_WS_URL`의 호스트·포트·프로토콜을 재사용하고 경로만 `/v1/space/ws`로 바꿉니다. 별도 공간 URL 환경변수는 없습니다.

## 배포

```bash
pnpm chat:types
pnpm chat:typecheck
pnpm build:chat
pnpm chat:deploy
```

`wrangler secret put`으로 `ENFORCEMENT_SECRET`, `IP_GUARD_SECRET`를 등록하고, `CHAT_ALLOWED_ORIGINS`는 Worker 변수로 설정합니다. 운영 도메인의 정확한 Origin은 `CHAT_ALLOWED_ORIGINS`에 쉼표로 지정합니다.

Durable Object는 `apac-ne` 위치 힌트로 생성되며, `wrangler.jsonc`의 SQLite migration과 Rate Limit binding을 함께 배포해야 합니다.

`v1`은 옛 `ChatRoom`, `v2`는 SQLite-backed `SpaceRoom` namespace를 등록하고, `v3`는 `ChatRoom`을 삭제합니다. 이미 배포된 migration은 지우거나 고치지 않고 뒤에 덧붙입니다. `SpaceRoom`은 위치를 SQL에 기록하지 않고, 대화 기록(`chat_messages`, 최근 50개)과 IP별 발화 시각(`say_log`, 1분 보관)만 SQL에 둡니다. 런타임 타입 생성용 로컬 포트가 차단된 환경에서는 `pnpm chat:types --include-runtime=false`로 바인딩 타입만 생성하고 설치된 `@cloudflare/workers-types`를 사용합니다.

## 공간 연결·비용 구조

- 좌석은 50개입니다. 서버가 좌석·아바타 색·초기 위치를 배정하고, 접속 중인 같은 clientKey가 재접속하면 기존 좌석·위치를 새 소켓에 넘깁니다. 구소켓에는 `SESSION_REPLACED`와 close `4001`을 보내므로 클라이언트는 자동 재접속을 중단해야 합니다.
- 입장 대기는 최대 10개, 전체 소켓은 최대 60개, 공간 IP guard별 연결은 운영에서 2개입니다(재접속이 자기 자신의 죽은 소켓에 막히지 않게 1이 아니라 2입니다). 로컬 `localhost`/`127.0.0.1` Worker는 `.dev.vars`의 `SPACE_DISABLE_IP_CONNECTION_LIMIT=true`일 때만 IP 연결 제한을 해제합니다. 입장 프레임을 10초 안에 보내지 않으면 종료합니다. 두 경로 모두 기존 Origin allowlist와 IP upgrade limiter(경로별 30회/60초)를 통과해야 합니다. 한도를 넘긴 업그레이드는 429가 아니라 101로 받은 뒤 close `4010`으로 닫습니다 — 핸드셰이크 429는 브라우저가 JS에 전달하지 않아 클라이언트가 사유를 모르고 바로 다시 올라오고, 리미터는 거절한 요청도 창에 쌓으므로 락아웃이 스스로 길어집니다. `4010`을 받은 클라이언트는 60초를 쉽니다.
- 클라이언트는 15초마다 JSON이 아닌 원문 `ping`을 보내고 원문 `pong`을 처리합니다. `setWebSocketAutoResponse`가 유휴 ping에 응답하므로 이 keepalive는 공간 DO를 깨우지 않습니다.
- 이동이 들어오면 100ms 고정 틱으로 변경 좌석만 모아 바이너리 프레임 한 장으로 전원에게 보냅니다. 마지막 이동 뒤 빈 프레임을 두 번 더 보내 클라이언트가 정지를 알 수 있게 합니다. 프레임 하나는 헤더 8B + 좌석당 9B이며 최대 458B입니다. 빈 프레임은 8B입니다. 변경분이 없으면 타이머·스냅샷·SQL 쓰기가 없습니다. 입장·퇴장·말풍선은 JSON 이벤트입니다.
- 연결 메타데이터와 최종 위치는 `serializeAttachment`로 보관하고 hibernation 복귀 때 roster를 복원합니다. 채팅 본문은 attachment에 저장하지 않습니다. 입장자는 `welcome`으로 최근 대화(최대 50개, 64KiB를 넘으면 오래된 것부터 뺌)를 받고, 지난 대화는 말풍선으로 재생하지 않습니다.
- 종료 이벤트로 깨어났을 때 종료 소켓이 이미 연결 목록에서 빠져 있어도 callback attachment로 `leave`를 보냅니다. callback attachment도 사라진 드문 경계 조건에서는 살아 있는 사용자에게 전체 roster를 `welcome`으로 한 번 재동기화합니다. 같은 좌석에 새 연결이 있으면 오래된 소켓의 종료 이벤트로 퇴장시키지 않습니다.
- 유령 연결은 실제 입장·이동 이벤트가 있을 때 정리합니다. 마지막 정상 동작과 런타임 자동 pong 시각이 모두 60초 넘게 오래된 연결만 회수합니다. 유휴 정리를 위한 반복 타이머나 alarm은 없습니다.

## 공간 입력·말풍선 제한

공간은 PWA 전용·Turnstile 쓰기 인증을 요구하지 않고 관리자 삭제·읽기 전용 전환도 없습니다. 대신 Origin/IP·프레임·본문 제한을 적용합니다. 말풍선 관리가 필요해지면 별도 관리자 경로가 필요합니다.

- JSON 프레임 상한은 UTF-8 8KiB, 소켓당 입력은 초당 40개입니다. 잘못된 버전·바이너리 상향·유한하지 않은 좌표는 종료합니다.
- 이동 간격은 따로 검사하지 않습니다(도착 간격이 흔들리는 모바일에서 마지막 위치를 버렸음). 월드 경계와 8.5m/s 이동 예산(클라이언트 달리기 8m/s + 전송 여유)을 검증하고 yaw를 정규화합니다. 긴 백그라운드 간격은 경과 시간만큼 예산을 회복하므로 정상 복귀 이동을 차단하지 않습니다. 거절 시 서버의 `peer` 상태를 송신자에게 보내 보정합니다.
- 닉네임과 본문은 기존 `normalizeNickname`/`normalizeChatMessage`를 재사용합니다. 닉네임 8글자, 공간 채팅 본문 100 grapheme, 링크·연락처 제한과 선정성 필터가 적용됩니다. 같은 연결의 말풍선은 3초에 한 번, 같은 IP guard 키는 연결을 합쳐 1분에 12개까지 허용합니다.
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
