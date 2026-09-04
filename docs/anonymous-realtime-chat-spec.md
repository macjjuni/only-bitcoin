# 익명 실시간 채팅 규격서

> 버전: v0.15  
> 기준일: 2026-09-03  
> 제공 방식: 설치한 PWA에서 전역 플로팅 버튼으로 여닫는 채팅 패널  
> 상태: 구현 기준안

회원가입 없는 단일 공개 방 실시간 채팅이다. 특정 페이지에 채팅을 넣지 않고 Next.js 사이트의 전역 플로팅 버튼으로 패널을 열고 닫는다. 채팅은 홈 화면에 설치한 PWA를 아이콘으로 실행해 현재 창이 standalone 모드인 경우에만 제공한다. 일반 브라우저에서는 설치 안내만 제공하고 채팅 연결을 만들지 않는다. 답글과 고정 리액션을 지원한다. 메시지는 기간 제한 없이 최신 300개만 저장·조회하며 301번째 메시지가 들어오면 가장 오래된 메시지를 삭제한다. 채팅의 영속 데이터는 Cloudflare Durable Object의 SQLite에만 저장하며 기존 Postgres와 Supabase에는 저장하지 않는다.

이 문서에서 날짜와 하루의 경계는 모두 `Asia/Seoul`을 기준으로 한다.

## 1. 확정값

| 항목 | 값 | 비고 |
| --- | --- | --- |
| 메시지 본문 | 최대 300 grapheme | 120 grapheme 이후 접기 |
| 스트림 | 최근 300개 | 초과 시 오래된 메시지부터 삭제 |
| 최초 전송 | 최신 50개 | 오래된 순서로 정렬해 렌더링 |
| 추가 조회 | 최대 50개 | `beforeId` 커서 방식 |
| 닉네임 | 최대 10 grapheme | 표시용 해시를 항상 병기 |
| 표시용 해시 | 8자리 소문자 16진수 | 기존 6자리 안은 충돌 위험 때문에 변경 |
| 답글 | 1단계 | 인용 스니펫 40 grapheme |
| 리액션 | `rocket`, `fear`, `diamond`, `up` | 메시지당 최대 99명, 재클릭 시 취소 |
| 선정성 표현 | 일치 구간을 `🔞`로 치환 | 원문은 저장하지 않음 |
| 회원가입 | 없음 | 이메일과 비밀번호를 수집하지 않음 |
| 채팅 이용 조건 | 현재 PWA standalone 실행 중 | 일반 브라우저에서는 설치 안내만 표시 |
| 프로토콜 | JSON, v1 | 프레임 최대 8 KiB, 바이너리 거부 |

표시용 해시는 보안 식별자가 아니다. 6자리 16진수는 일일 이용자가 1,000명일 때 생일 문제에 따른 충돌 확률이 약 3%이므로 8자리로 늘린다. 중복 리액션과 레이트리밋에는 외부에 노출하지 않는 전체 길이 키를 사용한다.

## 2. 아키텍처

```text
Next.js 사이트
  ├─ 일반 브라우저 ──> Vercel: 플로팅 버튼과 PWA 설치·실행 안내만 제공
  │                         └─> 채팅 HTTP/WebSocket 요청 없음
  └─ PWA standalone
       ├─ 패널 닫힘 ──> Cloudflare Worker: 대상 사용자만 온라인 수 HTTP 조회
       └─ 패널 열림 ──> Cloudflare Worker: WebSocket 연결과 공개·관리자 라우팅
                                    └─> ChatRoom Durable Object: main
                                            └─> DO SQLite
```

| 구성 | 역할 |
| --- | --- |
| Vercel | 기존 Next.js 페이지, PWA manifest, 전역 플로팅 버튼·설치 안내·채팅 패널과 정적 자산 제공 |
| Cloudflare Worker | Origin 검사, 라우팅, WebSocket 업그레이드, 관리자 인증 경계 |
| Durable Object | 연결 유지, 입력 검증, 레이트리밋, SQLite, 팬아웃, 온라인 수 |
| Supabase/Postgres | 관여하지 않음 |

Durable Object는 `idFromName("main")`으로 얻은 단일 인스턴스를 사용하고 최초 stub 생성에 `locationHint: "apac-ne"`를 준다. location hint는 최선 노력 방식이며 한국 리전 보장을 뜻하지 않는다. 이미 생성된 인스턴스에는 뒤늦게 힌트를 바꿔도 적용되지 않으므로 프로덕션 첫 생성 절차를 배포 체크리스트에 둔다.

단일 방의 강한 순서 보장을 위해 v1에서는 단일 DO를 사용한다. 예상 피크 25명을 기준으로 동시 WebSocket 50개, 60초간 초당 100개 inbound frame의 짧은 버스트만 출시 부하 시험 범위로 둔다. 다중 방과 대규모 팬아웃 설계는 v1 범위에서 제외한다.

### 2.1 공개 엔드포인트

| 메서드 | 경로 | 역할 |
| --- | --- | --- |
| GET Upgrade | `/v1/chat/ws` | 채팅 WebSocket 연결 |
| GET | `/v1/chat/online` | PWA에서 닫힌 플로팅 버튼의 온라인 수 배지 조회 |
| GET | `/v1/chat/health` | 저장소 쓰기를 하지 않는 상태 확인 |

WebSocket과 HTTP 요청은 허용된 `Origin`만 받는다. 운영·스테이징 허용 목록을 분리하고, 브라우저가 보낸 IP·익명 ID·닉네임은 신뢰하지 않는다. Worker 및 관측 로그에는 본문, 닉네임, IP, UA, 내부 식별 키를 남기지 않는다.

PWA 실행 여부는 브라우저가 제공하는 현재 표시 모드를 프론트엔드에서 확인하는 UX 정책이다. 일반 브라우저와 standalone PWA의 네트워크 요청은 서버 입장에서 암호학적으로 구분할 수 없으므로 이를 인증·신원 확인·봇 방지 경계로 취급하지 않는다. 클라이언트가 보낸 `isStandalone` 같은 값으로 Worker 접근 권한을 판정하지 않으며, 서버의 Origin 검사·레이트리밋·Turnstile은 별도로 유지한다.

`/v1/chat/online`은 Worker의 `caches.default`에서 15초 캐시한다. 허용 Origin별로 정규화한 고정 cache key를 사용하고 query string, Cookie와 기타 요청별 header는 key에서 제외한다. cache miss에서만 DO를 호출하고 `Cache-Control: public, s-maxage=15`인 응답을 `ctx.waitUntil(cache.put(...))`으로 저장한다. `Set-Cookie`는 넣지 않는다. Cache API는 데이터센터 로컬이며 언제든 축출될 수 있으므로 cache miss와 DO 호출 실패를 정상 분기로 처리한다.

### 2.2 하이버네이션

반드시 `state.acceptWebSocket()`과 `webSocketMessage()`, `webSocketClose()`, `webSocketError()`를 사용한다. 표준 `ws.accept()`와 WebSocket 이벤트 리스너 방식은 사용하지 않는다.

- 연결별 `stableActorKey`, `dailyActorKey`, `anonId`, `nickname`, `verifiedUntil`, 프로토콜 버전을 `ws.serializeAttachment()`에 저장한다.
- 기상 후 연결 목록은 메모리 `Set`이 아니라 `state.getWebSockets()`로 복원한다.
- constructor에서는 message SQL을 읽지 않고 빈 cache와 `messagesLoadPromise`만 초기화한다.
- `ensureMessagesLoaded()`는 single-flight promise로 최대 300개의 message 행을 한 번 읽어 ID 조회·팬아웃용 bounded cache와 최근 60초의 `sayTimestampsByActorTag`를 복원한다. `join`, `say`, `more`, `react`, 관리자 메시지 삭제 경로에서만 호출한다.
- WebSocket upgrade 자체, `/online`, `/health`, 킬스위치 조회·변경은 `ensureMessagesLoaded()`를 호출하지 않는다. 특히 `/online`은 `state.getWebSockets()`와 socket attachment만 사용하므로 DO를 깨워도 SQLite row read는 0이다.
- 동시에 여러 `join`이 들어와도 같은 `messagesLoadPromise`를 await해 복원 쿼리를 한 번만 실행한다. 로딩 실패 시 promise를 비워 다음 요청에서 재시도하되 부분 cache는 공개하지 않는다.
- 메시지, 메시지 안의 리액션 상태, 닉네임 변경 시각은 변경과 같은 이벤트 안에서 SQLite에 확정한다.
- “하이버네이션 직전 저장” 훅은 존재하지 않으므로 메모리 버퍼를 나중에 직렬화하는 설계는 사용하지 않는다.
- 상시 `setInterval()`과 heartbeat frame을 사용하지 않는다. 둘 다 유휴 하이버네이션을 방해하거나 불필요한 요청을 만든다.
- 리액션이 처음 변경된 시점에만 1초 `setTimeout()`을 하나 예약한다. 최대 1초의 비하이버네이션은 허용하고, 전송 후 타이머와 dirty map을 즉시 비운다. 이 배치의 목적은 클라이언트 렌더링과 대역폭을 줄이는 것이며, 아웃바운드 WebSocket request 과금 절감이 아니다.
- alarm은 다음 한국 시간 자정에만 예약해 열린 연결의 일일 anonId를 교체하고 만료된 actor state를 정리한다. 메시지 기간 만료에는 사용하지 않는다.

### 2.3 WebSocket upgrade와 join 미완료 연결 방어

Worker는 DO에 요청을 넘기기 전에 `CF-Connecting-IP`의 IPv4 전체 또는 IPv6 `/64` prefix를 `IP_GUARD_SECRET`으로 HMAC한 단기 `ipGuardKey`를 만든다. 원본 IP는 즉시 폐기하고 신원, 메시지, 밴에 사용하지 않는다.

여기서 `join 미완료 연결`은 회원가입과 무관하다. WebSocket upgrade는 성공했지만 클라이언트의 첫 `join` frame 검증을 아직 마치지 않은 `joined: false` 연결을 뜻한다.

- Worker Rate Limiting binding으로 `ipGuardKey + /v1/chat/ws`당 60초에 upgrade 30회를 넘으면 DO를 호출하지 않고 HTTP `429`를 반환한다. 이 제한은 Cloudflare location별·eventually consistent인 1차 완화책이며 정확한 동시 연결 계수로 취급하지 않는다.
- DO는 WebSocket을 accept하기 전에 기존 socket attachment를 조회해 같은 `ipGuardKey`의 전체 연결 최대 20개, 방 전체 연결 최대 500개, 방 전체 join 미완료 연결 최대 100개를 정확히 적용한다. 하나라도 초과하면 HTTP `429`를 반환한다.
- accept한 소켓의 초기 attachment에는 `joined: false`, `ipGuardKey`, `joinDeadlineAt`을 저장한다. 10초 안에 유효한 `join`을 받지 못하면 close code `4009`로 종료한다. join이 성공하면 deadline timer를 취소하고 attachment에서 deadline만 제거한다. `ipGuardKey`는 동시 연결 상한을 위해 socket close까지 유지한다.
- 최대 100개의 join 미완료 연결만 10초 timer를 가질 수 있으므로 공격자가 무제한 timer와 attachment를 만들 수 없다. join 완료 후에는 3.2절의 `stableActorKey`당 최대 3개 제한으로 전환한다.
- IP 제한은 socket 자원 고갈에 대한 경계 방어에만 사용한다. 발언·리액션·닉네임 제한이나 24시간 제재에는 사용하지 않아 CGNAT 이용자의 서비스 신원을 합치지 않는다. 국내 CGNAT의 공동 제한 위험을 감안해 IP당 상한은 예상 정상 사용보다 높은 20개로 두고 실제 거부율을 확인한다.

## 3. 신원과 세션

### 3.1 식별 키

브라우저는 최초 방문에 128-bit 이상의 임의 `clientKey`를 생성해 localStorage에 보관하고 `join`에서 보낸다. 서버는 형식과 길이를 검사한 뒤 HMAC 파생값만 사용하고 원본 `clientKey`를 저장하지 않는다. 서비스 신원에 IP와 UA를 넣지 않으므로 CGNAT 이용자끼리 레이트리밋·온라인 수를 공유하지 않고, LTE와 Wi-Fi 사이를 이동해도 같은 브라우저 신원을 유지한다.

```ini
stableActorKey = HMAC-SHA-256(ENFORCEMENT_SECRET,
  "actor\0" + clientKey)

dailyActorKey = HMAC-SHA-256(ACTOR_SECRET,
  "daily\0" + YYYY-MM-DD_KST + "\0" + stableActorKey)

anonId = hex(dailyActorKey).slice(0, 8)

sayBucket = floor(createdAt / 300000)

sayActorTag = hex(HMAC-SHA-256(ENFORCEMENT_SECRET,
  "say\0" + sayBucket + "\0" + stableActorKey)).slice(0, 32)
```

- `anonId`만 클라이언트에 공개한다.
- `dailyActorKey` 전체값은 당일 표시 신원 계산에만 사용하고 message 행에는 저장하지 않는다.
- `sayActorTag`는 5분 bucket 안에서만 같은 actor의 발언을 연결하는 비공개 128-bit 값이다. rolling 60초 검사에서는 현재 bucket과 직전 bucket의 tag를 계산해 합산한다. 60초 뒤 필드를 비우기 위한 추가 UPDATE는 하지 않지만 서로 다른 5분 bucket의 메시지를 DB 값만으로 연결할 수 없다.
- `stableActorKey`는 동시 연결 제한, 단기 레이트리밋, 리액션 중복 방지와 Turnstile pass 바인딩에 사용한다. 관련 상태는 필요한 기간만 저장한다.
- 한국 시간 자정 alarm에서 열린 소켓의 `stableActorKey`로 새 `dailyActorKey`와 `anonId`를 계산해 다시 serialize하고 해당 클라이언트에 새 `me`를 보낸다.
- localStorage를 지우거나 시크릿 모드를 사용하면 새 신원으로 우회할 수 있다. 다만 기존 pass가 새 `stableActorKey`와 일치하지 않으므로 모든 변경 동작 전에 Turnstile을 다시 통과해야 한다.
- 시크릿은 `wrangler secret`으로 주입한다. `ACTOR_SECRET`과 `PASS_SIGNING_SECRET`만 분기 첫날 한국 시간 00:00에 교체하고, pass 검증을 위해 직전 `PASS_SIGNING_SECRET`은 24시간만 유지한다.
- `ENFORCEMENT_SECRET`은 서비스 수명 동안 정기 교체하지 않는다. 이를 바꾸면 `stableActorKey`와 모든 `reactionActorToken`이 달라져 기존 반응의 취소와 중복 판정이 깨진다. 보안 사고로 강제 교체할 때는 300개 메시지의 reaction actor map과 count를 모두 초기화하고 기존 pass와 actor state를 폐기하는 명시적 운영 작업으로 수행한다.
- 날짜는 클라이언트가 아니라 서버 시각으로 계산한다. IP는 Siteverify의 선택적 `remoteip` 전달과 Cloudflare 경계 보안에서만 일시 처리하며 애플리케이션 신원 키에 넣지 않는다.

브라우저 랜덤 키와 파생 키, IP·UA의 단기 처리값을 완전한 익명정보라고 단정하지 않는다. 개인정보처리방침과 내부 운영에서는 가명·온라인 식별 정보에 준해 최소 수집, 제한 보관, 접근 통제를 적용한다.

### 3.2 닉네임

화면 표기는 `사토시#a3f9c1d2` 형식이다. 닉네임은 클라이언트 `localStorage`에 저장하지만 서버가 매 연결과 변경마다 재검증한다. 기본 닉네임은 `익명`이다.

다음 조건이면 거부한다.

- `#` 포함
- 공백만 존재
- 운영자, 관리자, 시스템, 공지, `admin`, `administrator`, `moderator`, `mod`, `staff`, `official`의 대소문자 무시 부분 일치
- 제로폭 문자 또는 양방향 제어 문자 포함
- 정규화 후 결합 문자가 3개 이상 연속
- `Extended_Pictographic`, 국기, 키캡 등 이모지 시퀀스 포함
- URL, 도메인, 이메일, 전화번호, 메신저 ID 패턴 포함

닉네임은 서버 저장 시 NFC 정규화하고 앞뒤 공백을 제거한다. 변경은 성공 시점부터 5분에 1회이며 재연결과 하이버네이션으로 우회할 수 없도록 SQLite의 actor state에 기록한다. 과거 메시지와 답글의 닉네임은 소급 변경하지 않는다.

위 거부 조건을 통과한 닉네임에도 7.2절의 선정성 표현 치환을 적용한다. 사용자가 입력한 이모지는 계속 거부하지만 서버가 필터 결과로 삽입한 `🔞`는 허용한다. 저장·표시·답글 스냅샷에는 치환된 닉네임만 사용한다.

한 브라우저 신원당 동시 WebSocket은 최대 3개다. 네 번째 연결은 close code `4008`로 거부한다.

## 4. 메시지

### 4.1 정규화 순서

서버는 다음 순서로 처리하고, 최종 저장값을 기준으로 길이를 다시 센다.

1. 문자열 타입과 UTF-8 8 KiB 이하 여부 확인
2. CRLF를 LF로 통일
3. 허용하지 않는 C0/C1 제어문자, `U+200B`, `U+2060`, `U+FEFF`, 양방향 제어문자 제거
4. NFC 정규화와 앞뒤 공백 제거
5. 연속 개행 3개 이상을 2개로 축소
6. 총 개행이 5개를 초과하면 거부
7. 동일 grapheme이 10회 넘게 연속되면 10회로 축소
8. 공백만 남거나 1 grapheme 미만이면 거부
9. `Intl.Segmenter("ko", { granularity: "grapheme" })` 기준 300 grapheme 초과 시 거부
10. 링크와 연락처가 있으면 거부
11. 선정성 표현의 일치 구간을 `🔞`로 치환
12. 치환된 최종 문자열의 공백·길이 조건을 다시 확인한 뒤 저장

본문에서는 이모지를 허용한다. emoji ZWJ 시퀀스를 깨지 않기 위해 `U+200D`는 유효한 이모지 시퀀스 내부에서만 허용한다. 보안 검사에는 별도의 NFKC·소문자 scan view를 만들되 실제 표시 문자열은 NFC 값을 사용한다.

클라이언트도 같은 grapheme 함수를 공유한다. 240자부터 카운터를 표시하고 300자에서 입력과 붙여넣기를 제한한다. 한글 IME 조합 중에는 자르지 않고 `compositionend`에서 보정한다. 서버 검증은 항상 최종 권한이다.

### 4.2 답글

`parentId`는 현재 스트림의 메시지를 가리킬 때만 답글로 저장한다. 답글의 parent는 발언 시점 스냅샷이다.

```yaml
parent:
  id: "4790"
  anonId: "7b2e04a1"
  nickname: "김프헌터"
  snippet: "김프가 왜 이렇게 튀는지"
```

- 답글의 답글을 선택해도 최상위로 올라가지 않고 선택한 메시지 본문을 인용한 1단계 parent만 만든다.
- snippet은 선정성 표현이 치환된 저장 본문에서 만들고, 줄바꿈을 공백으로 바꾸고 연속 공백을 하나로 합친 뒤 40 grapheme에서 자른다.
- 원문이 버퍼에서 밀려나도 답글은 단독 렌더링한다.
- 사용자가 답글을 작성하는 사이 `parentId`가 최신 300개에서 밀려났다면 `say` 자체를 거부하지 않는다. 서버가 parent를 제거하고 동일 본문을 일반 메시지로 저장한 뒤 ack에 `parentDetached: true`를 넣는다.
- parent 조회와 스냅샷 복사, 신규 메시지 INSERT, 300개 초과 정리는 같은 DO 이벤트의 동기 트랜잭션에서 처리한다. parent가 INSERT 직전까지 존재했다면 스냅샷을 먼저 복사하므로 같은 INSERT로 원글이 밀려나도 답글은 유지된다.
- 클라이언트는 `parentId`만 보내며 닉네임·anonId·snippet 스냅샷을 보내지 않는다. parent가 없을 때도 클라이언트 값을 대신 믿지 않는다.

### 4.3 ID와 멱등성

메시지 ID는 SQLite `INTEGER PRIMARY KEY`의 증가값을 문자열로 직렬화한다. 모든 변경 프레임에는 클라이언트가 생성한 UUID v4 `rid`를 포함하고 성공 시 송신자에게 `ack`를 보낸다.

멱등성 정보는 별도 hot table에 매 요청마다 쓰지 않고 변경 대상과 함께 저장한다. `say`의 rid는 생성된 message 행, `react`의 최근 rid는 해당 message의 JSON 상태, `nick`의 rid는 actor state에 넣는다. 최근 10분 또는 대상별 64개 중 먼저 도달하는 범위만 유지한다. 중복 rid는 상태를 다시 변경하지 않고 기존 결과로 ack한다. 연결이 끊겼다고 `say`를 자동 재전송하지 않으며, ack를 받지 못한 초안은 사용자에게 재전송 여부를 보여준다.

### 4.4 렌더링 안전

본문과 닉네임은 plain text로만 렌더링한다. HTML, Markdown, 자동 링크 변환을 지원하지 않는다. 필터가 넣은 `🔞`도 문자열 그대로 렌더링한다. React의 텍스트 렌더링을 유지하고 `dangerouslySetInnerHTML`을 사용하지 않는다.

클라이언트는 전송 직후 입력 원문을 메시지 목록에 낙관적으로 추가하지 않는다. 전송 중 상태만 표시하고 서버가 치환을 끝내 보낸 `msg.message`를 받은 뒤 목록에 추가한다. 프론트엔드에 선정성 사전을 복제하지 않으며 클라이언트 미리보기 결과를 신뢰하지 않는다.

## 5. 메시지 리액션

리액션은 다음 4종으로 고정한다.

| key | 표시 |
| --- | --- |
| `rocket` | 🚀 |
| `fear` | 😱 |
| `diamond` | 💎 |
| `up` | 👍 |

리액션은 각 메시지 아래에 Teams와 같은 count chip으로만 표시한다. count가 0인 종류는 기본 목록에서 숨기고, 반응 추가 버튼을 눌러 4종 선택기를 연다. 자신이 누른 chip은 색과 `aria-pressed="true"`로 구분한다. 같은 종류를 다시 누르면 취소하며 한 사용자가 한 메시지에 서로 다른 여러 종류를 누르는 것은 허용한다.

전체 리액션 순위, 상위 메시지, 별도 리액션 탭은 만들지 않는다. 리액션은 해당 메시지가 최신 300개에서 삭제될 때 함께 사라진다.

리액션 사용자를 별도 행과 unique index로 저장하지 않는다. message 행의 `reaction_state` JSON에는 메시지별 actor token 하나와 4비트 반응 mask, 최근 rid, 네 count를 함께 둔다. 한 actor가 여러 종류를 눌러도 토큰은 하나만 저장한다.

```ini
reactionActorToken = SHA-256(
  "reaction\0" + messageId + "\0" + stableActorKey)

reactionMask = rocket(1) | fear(2) | diamond(4) | up(8)
```

해당 token의 bit가 없으면 추가하고 있으면 제거하는 toggle이다. mask가 0이 되면 actor entry 자체를 삭제한다. `stableActorKey`를 사용하므로 날짜가 바뀌어 표시용 `anonId`가 달라져도 기존 반응을 다시 눌러 취소할 수 있다. 화면용 8자리 `anonId`는 중복 판정에 사용하지 않는다. `reaction_state`와 count는 인덱스 대상에서 제외해 정상 toggle 한 번을 message 본문 행 1회 쓰기로 끝낸다.

메시지 하나의 `reaction_state.actors`는 최대 99개 entry로 제한한다. 상한에 도달했을 때 처음 반응하는 actor는 `REACTION_CAPACITY`로 거부하고 count나 JSON을 변경하지 않는다. 이미 entry가 있는 actor의 다른 종류 추가, 기존 반응 취소와 변경은 계속 허용한다. 상한 이후 count만 올리고 token을 버리는 방식은 중복 방지와 취소를 깨뜨리므로 사용하지 않는다.

메시지별 token이라 DB snapshot만 단독으로 유출된 경우에는 서로 다른 메시지의 token을 바로 연결하기 어렵다. 그러나 서버는 현재 연결의 `stableActorKey`를 알고 각 메시지의 token을 재계산할 수 있으므로, 운영 중인 서버와 권한 있는 운영자에 대해서는 같은 브라우저 신원의 반응을 조회할 수 있다. 이를 익명성 보장으로 표현하지 않고 개인정보처리방침에는 서버가 안정 식별 키를 이용해 반응 중복을 판정하고 현재 300개 안의 반응 선택을 확인할 수 있다고 명시한다.

변경된 메시지 ID와 최신 count만 dirty map에 넣고, 첫 변경 때 시작한 1초 창이 끝나면 하나의 `react` 프레임으로 브로드캐스트한다. 변경이 없으면 타이머도 프레임도 만들지 않는다. 토큰과 count는 같은 message 행에 즉시 원자적으로 저장하므로 배치 전에 장애가 나도 서로 어긋나지 않는다.

`init`과 `more` 응답을 만들 때는 각 message의 actor map에서 현재 연결의 `reactionActorToken`과 mask를 확인해 `myReactions`를 붙인다. 이는 해당 클라이언트에만 보내는 파생 필드이며 SQLite에 별도로 저장하지 않는다. 실시간 toggle의 활성 여부는 요청자에게 보내는 `ack.reaction.active`로 갱신한다.

## 6. 300개 보관과 소멸

메시지에는 작성 후 며칠 같은 기간 제한을 두지 않는다.

1. 신규 메시지를 저장한다.
2. 전체 message 행이 300개를 초과하면 ID가 가장 작은 행부터 삭제해 정확히 300개를 남긴다.
3. INSERT와 초과 DELETE는 같은 `ctx.storage.transactionSync()`에서 수행한다.
4. 최초 접속, 추가 조회와 실시간 스트림은 모두 이 300개만 사용한다.
5. 조용한 방에서는 300개가 채워질 때까지 오래된 메시지가 기간 제한 없이 남을 수 있다.

삭제는 SQLite `DELETE`로 수행한다. 다만 SQLite-backed Durable Objects는 최근 30일 안의 시점으로 DB 전체를 복원할 수 있는 PITR을 제공하므로 301번째 글에 밀려 삭제된 데이터가 Cloudflare의 복구 이력에 최대 30일 남을 수 있다. 서비스가 조회·운영하는 데이터는 항상 최신 300개이고 PITR은 평상시 조회에 사용하지 않는 공급자 재해 복구 이력으로 구분해 고지한다.

### 6.1 SQLite 논리 모델

| 테이블 | 핵심 데이터 | 삭제 기준 |
| --- | --- | --- |
| `messages` | 본문·작성자 스냅샷, 비공개 5분 `sayActorTag`, parent, 최대 99 actor의 reaction JSON, count, rid | 301번째부터 오래된 순서로 삭제 |
| `actor_state` | 닉네임, 변경 시각, 최근 nick rid, 당일 키와 stable key의 단기 매핑 | 마지막 활동 후 24시간 |
| `settings` | 킬스위치와 운영 상태 | 현재값 1행 |

`messages`는 최대 300행이므로 secondary index를 두지 않는다. ID 조회와 정렬은 별도 index가 필요 없는 `INTEGER PRIMARY KEY`를 사용하고 나머지는 bounded full scan으로 처리해 row reads와 row writes를 교환한다. reaction JSON과 count도 인덱싱하지 않는다. 메시지 작성과 300개 정리는 `ctx.storage.transactionSync()` 경계에서 처리한다.

## 7. 검증, 도배 방지, 제재

모든 제한은 DO 내부에서 최종 검증하며 성공한 동작만 카운트한다. 1~10초 제한은 `stableActorKey` 기반 메모리 bucket으로 처리한다. DO는 유휴 약 10초 이후에야 하이버네이션 대상이 되므로 이보다 짧은 만료 상태를 SQLite에 매번 쓸 필요가 없다. rolling 60초 발언량은 `ensureMessagesLoaded()`가 message cache와 함께 복원한 `sayTimestampsByActorTag`로 검사한다. 현재·직전 5분 bucket에 해당하는 tag의 60초 이전 timestamp를 제거하고 성공한 발언만 append하므로 활성 상태에서는 추가 row read가 0이다. 5분 닉네임 제한만 actor state에 저장한다.

| 대상 | 제한 | 초과 시 |
| --- | --- | --- |
| 발언 간격 | 3초에 1개 | `RATE_SAY_INTERVAL` |
| 발언 총량 | rolling 60초에 10개 | `RATE_SAY_MINUTE` |
| 동일 본문 | 직전 성공 본문과 같은 두 번째 발언부터 차단 | `DUPLICATE_BODY` |
| 닉네임 변경 | 5분에 1회 | `RATE_NICK` |
| 리액션 | rolling 1초에 5회 | `RATE_REACTION` |
| 스크롤백 | 1초에 1회 | `RATE_MORE` |
| WebSocket frame | 8 KiB | `FRAME_TOO_LARGE` 후 연결 종료 |

동일 본문 비교값은 선정성 표현 치환까지 끝난 최종 저장 본문이다. 첫 발언은 성공하고 바로 이어진 같은 본문의 두 번째 발언은 차단한다. 차단된 시도는 “직전 성공 본문”을 바꾸지 않는다.

### 7.1 링크와 연락처

링크는 예외 없이 차단한다. NFKC scan view에서 다음을 검사한다.

- `http`, `https`, `hxxp`, `www`, `t.me`, `telegram.me`, 카카오 오픈채팅 주소
- IPv4/IPv6 뒤 포트 또는 경로 형태
- 영문·한글 도메인과 punycode, `[.]`, `(.)`, `점` 등 흔한 점 우회
- 이메일 주소
- 한국 휴대전화 번호와 국가번호 형태
- `카톡`, `오픈톡`, `텔레그램`, `디스코드`, `라인` 뒤에 ID·문의·초대 표현이 붙는 패턴

탐지 문자열을 응답에 그대로 반사하지 않고 일반화된 오류만 보낸다.

### 7.2 선정성 표현 치환

금지어 사전은 노골적인 성적·선정성 단어만 포함한다. 일반 욕설, 정치적 표현, 투자 의견, `리딩방`, `원금 보장`, `수익 보장` 같은 사기 관련 표현은 금지어 사전에 넣지 않는다. 링크와 연락처는 단어 사전과 무관하게 7.1절에서 계속 거부한다.

선정성 표현이 발견돼도 발언이나 닉네임 변경 자체를 거부하지 않는다. 서버가 일치한 구간을 `🔞` 하나로 바꾼 뒤 치환된 값만 저장하고 브로드캐스트한다.

```text
입력:  앞부분 + [선정성 표현] + 뒷부분
저장:  앞부분 + 🔞 + 뒷부분
```

- 연속되거나 서로 겹치는 일치 구간은 하나로 합쳐 `🔞` 한 개로 치환한다. 떨어진 일치 구간은 각각 치환한다.
- 탐지는 NFKC·소문자 scan view에서 수행하되 원본 grapheme 위치의 대응표를 유지해 정상 문자를 잘못 잘라내지 않는다.
- 제로폭 문자 제거 후 문자 사이의 반복 구분자·공백을 이용한 명백한 우회도 검사한다. 우회 검사는 단어별 규칙으로 제한하고 전체 문장의 공백을 제거한 단순 부분 일치는 사용하지 않는다.
- 한국어의 정상 단어 일부가 우연히 일치하는 오탐을 막기 위해 항목마다 `exact token`, `bounded phrase`, `substring` 중 match 방식을 명시하고 예외 단어를 함께 테스트한다.
- 사전은 Worker 코드의 `adultTerms.ko.ts`에서 버전 관리하며 런타임 관리자 편집 기능은 만들지 않는다. 추가·삭제는 코드 리뷰와 오탐 회귀 테스트를 거쳐 배포한다.
- 원래 표현은 SQLite, WebSocket broadcast, ack, 로그, analytics 어디에도 남기지 않는다. 답글 snippet과 닉네임 스냅샷도 치환된 값에서만 만든다.
- 본문 전체가 한 개 이상의 선정성 표현으로만 이루어져도 치환 결과인 `🔞`는 유효한 메시지로 허용한다.

### 7.3 킬스위치

킬스위치는 DO SQLite의 단일 settings 행에 `enabled`, `reasonCode`, `updatedAt`으로 저장한다. 활성화하면 신규 `say`만 차단하고 읽기는 유지한다. 클라이언트에는 `readOnly` 상태와 일반화된 안내를 보낸다. 환경변수 킬스위치는 재배포가 필요하므로 사용하지 않는다.

## 8. Turnstile

최초 변경 동작 전에 한 번 검증하고 성공 pass를 24시간 유지한다. 닉네임 초기 적용과 읽기는 검증 전에도 허용하되 발언과 리액션은 검증 후 허용한다.

1. 서버가 `TURNSTILE_REQUIRED`를 보내면 클라이언트가 widget을 표시한다.
2. 클라이언트가 `verify` 프레임으로 token을 보낸다.
3. DO가 Siteverify API에서 `success`, `hostname`, `action`을 검증한다.
4. 성공하면 `stableActorKey`와 만료 시각에 바인딩한 서명 pass token을 발급한다.
5. 클라이언트는 pass token을 `localStorage`에 저장하고 재연결 시 최초 `join` 프레임으로 보낸다.

Turnstile token은 5분 유효, 1회용으로 취급하며 Siteverify는 5초 timeout과 동일 idempotency key를 사용한 1회 재시도만 허용한다. 검증 API timeout·5xx 때 기존 유효 pass 이용자는 계속 쓰고 새 검증 이용자는 읽기 전용으로 둔다. 보안 우회용 자동 fail-open은 두지 않는다.

운영과 스테이징 widget을 분리하고 production hostname을 제한한다. 로컬·CI는 Cloudflare 공식 test key를 사용한다. 실제 `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`는 배포 전에 주입해야 하는 환경값이지 제품 정책 TBD로 남기지 않는다.

## 9. 관리자 인증과 운영 API

관리자 경로는 Cloudflare Access 애플리케이션 뒤에 두고 Access JWT의 서명, `aud`, `exp`, 허용 이메일을 Worker에서 다시 검증한다. 고정 bearer token 하나만으로 보호하지 않는다. 변경 요청은 허용된 HTTP method와 Origin을 검사하고, body가 있는 요청은 JSON content type을 요구한다.

| 메서드 | 경로 | 역할 |
| --- | --- | --- |
| POST | `/v1/admin/chat/kill-switch` | 킬스위치 on/off |
| DELETE | `/v1/admin/chat/messages/:id` | 메시지 1개 영구 삭제 |

메시지 삭제는 대상 행을 hard delete하고 SQLite의 최대 300개를 순회해 `parent.id`가 대상과 같은 답글의 snippet을 빈 문자열로 바꾼다. 삭제와 답글 수정은 하나의 동기 트랜잭션으로 확정하고, 성공한 뒤 메모리 cache를 같은 결과로 갱신해 연결된 클라이언트에 `delete` 프레임을 보낸다. 트랜잭션이 실패하면 cache와 broadcast를 변경하지 않는다. 이미 없어진 ID도 `204`로 응답해 재시도를 멱등하게 만든다.

공개 채팅에는 삭제 버튼을 노출하지 않는다. 관리자 전용 삭제 외에 인앱 신고, 자동 숨김, 수동 숨김, 복구·unhide API는 만들지 않는다. 별도 `admin_audit` 테이블도 만들지 않고 Cloudflare Access 인증 로그만 사용한다. `ADMIN_EMAIL_ALLOWLIST`와 `CF_ACCESS_AUD`는 배포 필수값이다.

## 10. WebSocket 프로토콜 v1

모든 프레임은 JSON object이며 `v: 1`, `t`를 포함한다. 클라이언트 변경 요청과 그 응답에는 `rid`가 있다. 알 수 없는 필드의 무시 여부는 프레임별 schema로 고정하고, 알 수 없는 `t`나 버전은 거부한다.

### 10.1 Client → Server

| `t` | payload | 비고 |
| --- | --- | --- |
| `join` | `clientKey`, `nickname`, `passToken?` | 연결 후 반드시 처음 한 번 전송 |
| `verify` | `rid`, `token` | Turnstile token |
| `say` | `rid`, `body`, `parentId?` | 메시지 작성 |
| `react` | `rid`, `id`, `key` | toggle |
| `nick` | `rid`, `nickname` | 5분 제한 |
| `more` | `rid`, `beforeId` | 최대 50개 |

### 10.2 Server → Client

| `t` | payload | 비고 |
| --- | --- | --- |
| `init` | `messages`, `me`, `online`, `readOnly`, `serverTime` | 유효한 `join` 직후 |
| `ack` | `rid`, `action`, `id?`, `passToken?`, `reaction?`, `parentDetached?` | 송신자에게만 전송 |
| `msg` | `message` | 새 메시지 |
| `react` | `updates[]` | 1초 동안 변경된 메시지별 최신 count |
| `delete` | `id` | 관리자 영구 삭제와 답글 snippet 제거 반영 |
| `nick` | `me` | 닉네임 변경 결과 |
| `more` | `rid`, `messages[]`, `hasMore` | 오래된 순서로 반환 |
| `me` | `me` | 자정 식별자 전환 등 내 상태 변경 |
| `online` | `n` | 연결 중인 고유 stable actor 수 |
| `state` | `readOnly`, `reasonCode?` | 킬스위치 변경 |
| `err` | `rid?`, `code`, `message`, `retryAfterMs?` | 내부 상세 미노출 |

메시지 wire model은 다음과 같다.

```yaml
id: "4821"
anonId: "a3f9c1d2"
nickname: "사토시"
body: "그건 환율 영향이 큽니다"
parent:
  id: "4790"
  anonId: "7b2e04a1"
  nickname: "김프헌터"
  snippet: "김프가 왜 이렇게 튀는지"
reactions:
  rocket: 12
  fear: 3
  diamond: 0
  up: 5
myReactions: [rocket, up]
createdAt: 1788393600000
```

`myReactions`는 `init`과 `more`에서 현재 연결을 위해 계산한 선택적 필드다. 공용 `msg` broadcast에서는 생략하고 새 메시지의 로컬 값은 빈 배열로 취급한다. `react` update는 `{ id, reactions }`, react 요청의 ack는 `reaction: { id, key, active }`를 포함한다. 클라이언트는 공용 count는 `react`로, 자신의 눌림 상태는 ack로 갱신한다.

`delete`를 받으면 클라이언트는 해당 ID를 message map에서 제거하고, 현재 로드된 메시지 중 `parent.id`가 같은 항목의 snippet을 빈 문자열로 바꿔 “삭제된 메시지”로 렌더링한다. `say` ack의 `parentDetached`가 true이면 작성 본문은 정상 등록된 것이므로 실패로 표시하지 않고 “답글 대상이 사라져 일반 메시지로 등록됐어요”를 안내한다.

온라인 수는 `OPEN`이고 `joined = true`인 소켓 attachment의 전체 `stableActorKey` 고유 개수다. 같은 브라우저의 여러 탭은 한 명, 서로 다른 브라우저 프로필과 기기는 각각 한 명으로 센다. 연결·종료 변화는 500ms로 묶어 채팅 참여자에게 전송한다. `/online`은 같은 값을 반환하고 대상 브라우저만 60초 폴링하며 15초 edge cache를 적용한다.

Worker와 DO는 2.3절의 upgrade 제한을 통과한 연결만 `joined = false` attachment로 등록한다. 클라이언트의 첫 application frame은 반드시 `join`이어야 하고 10초 안에 받지 못하면 `4009`로 종료한다. DO는 join에서 `clientKey`로 서버 식별 키를 계산하며 그 전에는 init이나 방 broadcast를 보내지 않는다. `join.nickname`은 서버 actor state에 닉네임이 없을 때만 cooldown 없이 복원값으로 적용하며, 이미 저장된 값과 다르면 일반 닉네임 변경 제한을 적용한다. 이후 두 번째 `join`은 protocol error다.

## 11. 모바일·네트워크 복구

- 브라우저 `offline` 중에는 재연결하지 않고 `online` 이벤트에서 즉시 시도한다.
- visible 상태의 재연결은 full jitter를 넣은 1, 2, 4, 8, 15, 30초 지수 백오프를 사용하고 30초를 상한으로 계속 시도한다.
- 페이지가 백그라운드로 가면 새 재연결 타이머를 예약하지 않는다. 기존 WebSocket을 인위적으로 닫지는 않는다.
- `visibilitychange`로 visible 복귀 시 소켓이 OPEN이 아니면 즉시 한 번 재연결한다.
- 재연결 후 `init`의 최신 50개와 로컬 목록을 ID로 병합하고 중복 제거한다. 사용자가 과거를 읽고 있으면 스크롤 위치를 유지한다.
- 애플리케이션 ping/pong을 주기적으로 보내지 않는다. 포그라운드 복귀와 close/error로 stale 연결을 판정한다.
- 전송 중 연결이 끊긴 메시지는 자동 재전송하지 않는다. `rid` ack 상태에 따라 “전송 확인 안 됨” UI를 제공한다.

## 12. UI

- 모든 공개 페이지에 기존 플로팅 배너 스택과 함께 채팅 진입 버튼을 표시한다. 특정 페이지 본문에 채팅을 임베드하거나 `/chat` 전용 페이지를 만들지 않는다.
- 현재 창이 PWA standalone이면 플로팅 버튼이 채팅 패널을 연다. 현재 URL과 스크롤 위치를 바꾸지 않으며 같은 버튼·닫기 버튼·Escape로 닫는다. 브라우저 뒤로가기는 채팅 토글에 사용하지 않는다.
- 일반 브라우저에서 플로팅 버튼을 누르면 채팅 패널 대신 설치·실행 안내를 표시한다. Android의 지원 브라우저에서는 사용 가능한 설치 prompt를 연결하고, iOS에서는 공유 메뉴의 `홈 화면에 추가` 절차를 안내한다. 설치 후에도 현재 브라우저 탭에서 채팅을 바로 열지 않고 홈 화면 아이콘으로 다시 실행하도록 안내한다.
- 설치 prompt 제공 여부나 localStorage 플래그를 설치 완료의 증거로 사용하지 않는다. 실제 채팅 진입 조건은 현재 실행 환경의 standalone 판정뿐이다.
- standalone PWA에서 채팅을 한 번도 열지 않았다면 닫힌 버튼의 채팅 아이콘만 표시하고 `/online`을 호출하지 않는다. 한 번이라도 연 뒤에는 `opened` 플래그를 저장하고, 패널이 닫혀 있을 때만 HTTP로 조회한 현재 온라인 수를 버튼에 표시한다. 일반 브라우저, 열린 패널, hidden·offline 상태에서는 `/online`을 호출하지 않는다. 닫힌 동안에는 WebSocket을 열지 않으므로 실시간 미확인 메시지 수는 표시하지 않는다.
- 데스크톱은 버튼 위에 고정된 우측 하단 패널, 모바일은 Header와 BottomNavigation보다 위에 뜨는 전체 높이형 bottom sheet를 사용한다. 모바일 패널이 열린 동안 배경 스크롤을 잠그고 닫을 때 원래 버튼으로 포커스를 돌린다.
- 패널 최초 오픈 시 1회 보관 정책, 투자 권유 금지, 개인정보 작성 금지를 고지한다. 고지 버전을 localStorage에 저장해 정책 버전 변경 시 다시 표시한다.
- 본문 120 grapheme 이후 접기, 카운터는 240부터 표시, 300에서 입력 제한한다.
- 본인 메시지는 전체 `dailyActorKey`를 노출하지 않고 서버가 init에서 제공한 `anonId`와 현재 세션 상태로 표시한다.
- 빈 방에는 가짜 사용자나 자동 대화를 만들지 않는다. 대신 채팅 DB 밖의 실제 사이트 데이터를 이용한 `지금 시장` context card를 항상 제공한다. 기본 항목은 BTC 원화 가격, 24시간 등락률, 김치 프리미엄이며 기존 사이트 데이터 소스를 재사용한다.
- context card 아래에는 한국 날짜로 선택되는 `오늘의 질문` 하나를 표시한다. 단순 고정 문구 3개가 아니라 현재 지표를 포함한 큐레이션 템플릿을 사용한다. 예: “현재 김치 프리미엄 1.8%, 과열 신호라고 보나요?” 이 카드는 시스템 제공 정보임을 명시하고 메시지·리액션 대상에 포함하지 않는다.
- 온라인이 0명이면 “지금은 조용하지만 글은 최근 300개 안에서 다음 방문자가 볼 수 있어요”라고 비동기 대화의 기대를 설명한다. 첫 메시지가 생겨도 context card는 접힌 상태로 남겨 채팅 자체가 비어 보이지 않게 한다.
- 시장 데이터 조회가 실패하면 수치를 만들지 않고 “이번 주 비트코인 시장에서 가장 중요하게 보는 변수는 무엇인가요?” 같은 날짜별 중립 질문 하나만 보여준다.
- `REACTION_CAPACITY`를 받으면 “이 메시지는 99명이 반응해 더 이상 새로 참여할 수 없어요.”를 표시한다. 이미 반응한 사용자의 변경·취소 UI는 계속 활성화한다.
- 채팅 패널과 플로팅 버튼 안에는 광고를 넣지 않는다. 배경 페이지의 기존 광고와 채팅 UI가 겹치면 채팅 패널을 우선 표시한다.
- 채팅은 클라이언트에서 열린 뒤 수신되므로 페이지 HTML, metadata, sitemap, 구조화 데이터와 검색엔진용 콘텐츠에 포함하지 않는다.
- 토글 버튼은 `aria-expanded`와 `aria-controls`를 제공한다. 키보드 답글·리액션, `aria-live="polite"` 새 메시지 알림, 모션 감소 설정을 지원한다.

## 13. Next.js 프론트엔드 구현

현재 저장소의 Next.js 16 App Router, React 19, TypeScript, TailwindCSS, Zustand 구성을 사용한다. 채팅 때문에 별도 프론트 프로젝트나 별도 상태 관리 라이브러리를 만들지 않는다.

### 13.1 전역 위젯 경계

- `src/app/layout.tsx`에 이미 있는 `GlobalFloatingBanner`를 전역 진입점으로 사용한다. `BANNER_CONFIGS`에 항상 노출되는 `ChatFloatingBanner`를 추가한다. 일반 브라우저에서는 설치 안내를, standalone PWA에서는 `ChatPanel`을 portal로 한 번만 렌더링한다.
- `ChatFloatingWidget`은 Client Component이며 PWA 실행 모드 판정, 토글 상태, localStorage, WebSocket, `window`, `document`, Turnstile 접근은 이 경계 아래에서만 수행한다.
- 채팅용 `src/app/chat/page.tsx`는 만들지 않는다. 페이지 이동 없이 어느 공개 페이지에서든 같은 단일 방을 연다.
- 채팅 메시지를 Next.js Server Component, Server Action, Route Handler로 조회하거나 중계하지 않는다. 브라우저가 Cloudflare Worker의 WSS 주소에 직접 연결한다.
- 따라서 채팅 본문은 Vercel 데이터 캐시, 서버 로그, HTML, React Server Component payload에 들어가지 않는다. Supabase와 기존 Postgres에도 요청하지 않는다.
- Next.js metadata route인 `src/app/manifest.ts`에 앱 이름, 고정 `id`, `start_url`, `scope`, `display: "standalone"`, 테마 색상과 192·512 아이콘을 선언한다. iOS용 `apple-touch-icon`도 제공한다. 서비스 워커의 오프라인 기능 유무와 채팅 이용 조건은 분리하며, 네트워크가 없을 때 채팅 가능하다고 안내하지 않는다.
- standalone PWA이면서 `only-bitcoin:chat:opened:v1`이 있는 경우에만 닫힌 버튼의 온라인 수를 TanStack Query로 `/v1/chat/online`에서 60초마다 조회한다. 패널이 열려 있거나 페이지가 hidden·offline이면 polling을 멈추고, 닫힌 visible 상태로 복귀할 때 다시 조회한다. 패널 내부 온라인 수는 WebSocket의 `init`과 `online` frame을 사용한다.

권장 파일 경계는 다음과 같다. 각 레이어는 `index.ts` public API를 통하고 상위 레이어만 하위 레이어를 import한다.

```text
src/widgets/floating-banner/
  GlobalFloatingBanner.tsx
  ui/ChatFloatingBanner.tsx
src/widgets/chat-panel/
  index.ts
  ui/ChatPanel.tsx
  ui/ChatMessageList.tsx
  ui/ChatComposer.tsx
src/features/chat-session/
  index.ts
  api/chatSocket.ts
  model/chatStore.ts
  model/useChatConnection.ts
src/entities/chat-message/
  index.ts
  model/chatMessage.ts
  model/chatProtocol.ts
  ui/ChatMessageItem.tsx
src/shared/config/chat.ts
src/shared/lib/pwa/isStandaloneRuntime.ts
src/shared/lib/text/countGraphemes.ts
```

`ChatFloatingBanner`가 버튼과 패널의 open state를 소유하고 `ChatPanel`에 전달한다. 패널을 조건부로 unmount하더라도 draft가 사라지지 않도록 draft는 버튼과 함께 계속 mount된 상위 위젯에 둔다. 컴포넌트와 hook은 프로젝트 규칙에 따라 `Hooks`, `Privates`, `Events`, `Transactions`, `Life Cycles` region을 사용한다.

`isStandaloneRuntime()`은 `window.matchMedia("(display-mode: standalone)").matches`를 기본 판정으로 사용하고 iOS 호환을 위해 `navigator.standalone === true`를 보조 조건으로 사용한다. 이 값은 hydration 이후 클라이언트에서만 계산한다. 판정 전에는 채팅 패널과 네트워크 요청을 시작하지 않는 닫힌 상태로 둔다. 이 함수의 결과를 Worker에 인증값으로 전송하거나 접근 제어에 사용하지 않는다.

### 13.2 플로팅 배치와 접근성

- 채팅 버튼은 기존 `.only-btc__floating-banner` 스택 안에서 다른 플로팅 액션과 같은 우측 여백과 BottomNavigation offset을 사용한다. 개별 `fixed` 좌표를 하나 더 만들어 버튼끼리 겹치게 하지 않는다.
- 버튼은 항상 같은 위치에 둔다. standalone PWA에서는 `채팅 열기/닫기` accessible name, `aria-expanded`, `aria-controls`, 온라인 수 배지를 제공하고, 일반 브라우저에서는 `채팅 앱 설치 안내`라는 accessible name을 제공한다.
- 데스크톱 패널은 우측 하단에 최대 너비 420px로 띄우고 화면 높이를 넘지 않는다. 페이지 조작을 막지 않는 non-modal panel로 동작하며 Escape와 닫기 버튼을 지원한다.
- 모바일 패널은 `100dvh` 안의 modal bottom sheet로 열고 Header, BottomNavigation, 기존 배너보다 높은 layer를 사용한다. 배경 scroll lock, focus trap, 닫은 뒤 launcher로 focus 복귀를 적용한다.
- route가 바뀌어도 패널 open state와 draft는 유지한다. 단, 전체 새로고침 후에는 안전하게 닫힌 상태로 시작하고 사용자가 열기 전에는 WebSocket을 만들지 않는다.
- 채팅 패널 내부에는 광고 slot, 외부 링크, 공유 버튼을 배치하지 않는다.

### 13.3 상태 소유권

WebSocket 서버 상태는 하나의 Zustand store가 소유한다.

| 상태 | 소유 위치 | 비고 |
| --- | --- | --- |
| `connectionStatus`, `me`, `online`, `readOnly` | chat store | 연결과 서버 상태 |
| `messageIds`, `messagesById` | chat store | ID 기준 정규화, 최대 300개 |
| `hasMore`, `oldestId` | chat store | 추가 조회 커서 |
| pending `rid`와 ack 상태 | chat store의 메모리 상태 | 영구 저장하지 않음 |
| `myReactions` | message별 파생 상태 | init·more와 react ack로 복원 |
| 패널 open state, 답글 선택, 펼침 상태, draft | 전역 채팅 위젯 UI 상태 | 패널을 닫아도 draft와 화면 상태 유지 |

- 메시지 배열 전체를 프레임마다 새로 만드는 대신 ID 목록과 message map으로 정규화한다. 리액션 변경 시 해당 메시지 객체만 교체해 전체 목록의 불필요한 재렌더링을 피한다.
- `init`, `msg`, `more`는 ID로 병합하고 중복을 제거한다. 로컬에도 최신 300개만 남기며 서버에서 사라진 ID는 답글 선택에서도 제거한다.
- 메시지별 반응 count와 `myReactions`만 관리하며 전체 순위나 별도 파생 목록은 만들지 않는다.
- `delete`를 받으면 대상 ID를 제거하고 로드된 답글의 일치하는 parent snippet을 비운다. 현재 답글 작성 대상으로 선택한 메시지가 삭제됐으면 선택만 해제하고 draft 본문은 유지한다.
- TanStack Query에는 채팅 메시지를 복제하지 않는다. 닫힌 버튼의 온라인 수와 빈 방 context card의 기존 시장 데이터에만 사용한다.
- Zustand persist로 메시지, 본문, draft를 localStorage에 저장하지 않는다. 새로고침 후에는 서버 `init`으로 복원하며 작성 중 draft도 메모리에서만 유지한다.

### 13.4 토글과 WebSocket 수명주기

채팅은 기존 시세 feed 연결 객체를 공유하지 않고 전용 `chatSocket`을 둔다. 요구사항에 맞춘 작은 native WebSocket wrapper를 사용해 재연결 시점과 전송 큐를 직접 통제한다.

1. 초기 페이지 진입에는 플로팅 버튼만 hydrate하고 PWA 실행 모드를 판정할 때까지 채팅 네트워크 요청을 만들지 않는다.
2. 일반 브라우저에서는 버튼을 눌러도 설치 안내만 열고 WebSocket, `/online`, Turnstile을 호출하지 않는다.
3. standalone PWA에서 사용자가 버튼을 열면 localStorage 신원 정보를 준비하고 WebSocket을 연결한다.
4. 연결 직후 첫 frame으로 `join`을 보내고 `init` 전까지 변경 UI를 비활성화한다.
5. 패널을 닫으면 재연결 timer를 취소하고 소켓을 close code `1000`으로 닫는다. 메모리의 메시지와 draft는 유지한다.
6. 다시 열면 새 연결의 `init`을 기존 message map과 ID로 병합해 닫힌 동안 생긴 메시지를 반영한다.

- React Strict Mode의 개발 중 mount-cleanup-mount와 늦게 도착한 이벤트에 대비해 연결 세대 값을 두고 현재 세대가 아닌 handler 결과를 버린다.
- 상태는 `idle → connecting → open`과 `reconnecting`, `offline`, `readOnly`로 구분한다. `error` 한 번을 영구 장애로 취급하지 않는다.
- 패널이 열린 동안에만 11절의 visibility·online 규칙과 full jitter 백오프를 적용한다. 닫힌 패널은 visible 복귀나 online 이벤트로 재연결하지 않는다.
- upgrade HTTP `429`는 `Retry-After` 뒤 재시도하고, join timeout `4009`는 자동 재연결 루프를 멈춘 뒤 수동 `다시 연결` 버튼을 표시한다.
- OPEN이 아닐 때 `say`, `react`, `nick`을 전송 큐에 쌓지 않는다. 특히 `say`는 자동 재전송하지 않고 사용자가 다시 보낼 수 있도록 draft와 불확실 상태만 유지한다.
- `rid`는 브라우저의 `crypto.randomUUID()`로 만든다. socket 객체, timer, pending 요청은 localStorage나 Zustand persist 대상이 아니다.
- JSON parse 뒤 `v`, `t`, 필수 payload를 runtime guard로 검증한다. 타입 단언만으로 외부 frame을 신뢰하지 않으며 잘못된 frame은 UI 상태를 변경하지 않는다.

### 13.5 브라우저 저장과 Turnstile

localStorage key에는 버전을 포함하고 다음 다섯 항목만 저장한다.

```text
only-bitcoin:chat:client-key:v1
only-bitcoin:chat:nickname:v1
only-bitcoin:chat:notice-version:v1
only-bitcoin:chat:pass-token:v1
only-bitcoin:chat:opened:v1
```

- 첫 렌더에서 localStorage 값을 Server Component 출력과 섞지 않는다. 사용자가 패널을 처음 열 때 Client Component가 읽고 연결 준비 화면에서 실제 상태로 전환해 hydration 불일치를 막는다.
- standalone PWA에서 패널을 한 번 열면 `opened:v1 = "1"`을 저장한다. 이 값은 온라인 배지 polling 허용 여부만 나타내며 PWA 설치 여부, 신원이나 메시지를 포함하지 않는다.
- client key는 Web Crypto로 128-bit 이상을 생성한다. 닉네임과 pass token이 손상됐거나 형식이 다르면 폐기하고 기본값으로 복구한다.
- Turnstile은 첫 `TURNSTILE_REQUIRED` 때 로드한다. 검증 token은 브라우저에서 Worker로 직접 보내며 Vercel을 거치거나 로그에 남기지 않는다.
- Siteverify secret과 서명 secret은 프론트 환경변수에 두지 않는다. 프론트에는 공개 site key만 둔다.
- Turnstile 로딩이나 검증이 실패해도 작성 중인 draft를 지우지 않고 읽기 전용 안내를 표시한다.

### 13.6 메시지 목록과 입력 UX

- 메시지는 오래된 것에서 새것 순으로 렌더링한다. 최대 300개이므로 v1에는 가상 목록 라이브러리를 추가하지 않는다.
- 패널을 처음 열면 최신 메시지 하단을 보여준다. 사용자가 목록 하단 근처에 있을 때만 새 메시지에 자동 스크롤하고, 위쪽을 읽는 중이면 위치를 유지하며 `새 메시지 N개` 버튼을 표시한다.
- 상단에서 `more` 50개를 prepend한 뒤 `새 scrollHeight - 이전 scrollHeight`만큼 보정해 읽던 위치를 보존한다. 응답 전에는 추가 요청을 잠그고 `hasMore = false`면 관찰자를 해제한다.
- 패널을 닫았다 다시 열어도 메시지 목록의 스크롤 위치와 draft를 보존한다.
- 발언 전송 중에는 원문 메시지 bubble 대신 전송 상태만 표시하고, 서버가 돌려준 `msg`의 치환 완료 본문으로 확정한다.
- `parentDetached: true` ack를 받아도 발언은 성공이므로 draft를 정상적으로 비우고 일반 메시지 등록 안내만 표시한다.
- 입력기는 한글 IME의 `compositionstart`와 `compositionend`를 구분한다. 조합 중에는 300 grapheme 절단이나 Enter 전송을 하지 않는다.
- `countGraphemes`는 `Intl.Segmenter("ko", { granularity: "grapheme" })`를 사용한다. 붙여넣기와 일반 입력 모두 같은 함수로 300에서 자르며 서버가 최종 재검증한다.
- 모바일에서는 `100dvh`, `visualViewport`, `env(safe-area-inset-bottom)`을 고려해 키보드가 입력기와 최근 메시지를 가리지 않게 한다.
- 새 메시지 알림은 `aria-live="polite"`의 짧은 상태 문구로 제공하고 메시지 본문 전체를 매번 읽게 하지 않는다. 리액션 버튼은 눌림 상태를 `aria-pressed`로 표현한다.

### 13.7 환경값과 보안 경계

Next.js에는 공개값만 주입한다.

```ini
NEXT_PUBLIC_CHAT_API_URL=https://chat.example.com
NEXT_PUBLIC_CHAT_WS_URL=wss://chat.example.com/v1/chat/ws
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

이 값은 `src/shared/config/env.ts`에서 읽고 `src/shared/config/chat.ts`에서 URL 형식과 운영 HTTPS/WSS 여부를 검증한다. `ACTOR_SECRET`, `ENFORCEMENT_SECRET`, `PASS_SIGNING_SECRET`, `TURNSTILE_SECRET_KEY`, Cloudflare Access 값은 Worker에만 둔다.

- 별도 채팅 route가 없으므로 sitemap과 `robots.txt`를 변경하지 않는다. 채팅 메시지는 클라이언트 상태로만 렌더링하고 metadata나 구조화 데이터에 넣지 않는다.
- CSP의 `connect-src`에는 Worker HTTPS/WSS origin, Turnstile의 script와 frame에는 Cloudflare 공식 origin만 허용한다.
- analytics에는 버튼 열기·닫기 같은 집계 이벤트만 허용한다. 메시지 본문, 닉네임, anonId, reply snippet, rid, Turnstile token은 analytics나 광고 payload에 넣지 않는다.

### 13.8 프론트 테스트와 완료 기준

- Vitest: protocol runtime guard, ID 병합·정렬·300개 prune, 리액션 count·`myReactions` 갱신, ack 상태, grapheme 자르기, IME 조합, reconnect backoff를 fake timer로 검증한다.
- 컴포넌트 테스트: 판정 전과 일반 브라우저에서 WebSocket·`/online`·Turnstile 요청이 생성되지 않는지, 설치 안내가 열리는지, standalone PWA의 첫 채팅 오픈 후 `opened` 저장, 닫힌 상태의 60초 polling, 열기·닫기 연결 수명주기, route 전환 상태 유지, `more` prepend 후 스크롤 보존, 관리자 삭제 반영, parent detach, 읽기 전용, Turnstile 실패 시 draft 보존을 검증한다.
- Playwright: 일반 브라우저 모드와 standalone 모드를 각각 모의한다. 일반 모드의 설치 안내와 채팅 요청 0건, standalone 모드의 두 브라우저 context에서 메시지·답글·리액션 동기화, 닫힌 동안 발생한 메시지의 재오픈 병합, offline/online, 모바일 bottom sheet와 focus 복귀를 확인한다.
- 완료 시 `pnpm test`, `pnpm check`, `pnpm check:cycles`, `pnpm build`를 모두 통과해야 한다.
- 브라우저 Network 탭에서 일반 브라우저 모드에는 `/online`, WebSocket, Turnstile 요청이 없고, standalone PWA에서도 패널을 열기 전에는 WebSocket 연결이 없는지 확인한다. 채팅 본문은 Vercel 요청, analytics payload, 광고 payload에 포함되지 않고 Worker WebSocket으로만 전송되어야 한다.

## 14. 개인정보와 준수사항

아래는 법률 자문이 아니며 공개 전 국내 개인정보·플랫폼 규제 전문가의 확인을 받는다. “익명 게시판은 합법”처럼 포괄적으로 단정하지 않는다. 2012년 헌법재판소가 제한적 본인확인제 조항을 위헌으로 결정한 사실과, 개별 불법정보·권리침해 대응 의무는 별개의 문제다.

개인정보처리방침과 이용규칙에는 최소한 다음을 반영한다.

- 처리 항목: 브라우저에 저장하는 임의 client key와 채팅 열람 플래그, 연결 시 일시적으로 처리하는 IP·UA와 join 미완료 연결 방어용 IP HMAC, 파생된 일일·안정 식별 키와 5분 발언 tag, 치환 후 닉네임과 메시지, 리액션, Turnstile 결과
- 목적: 채팅 제공, 도배·사칭 방지, 보안
- 공개·운영 DB 보관: 기간 제한 없이 최신 300개. 301번째부터 오래된 순서로 삭제
- 공급자 복구 이력: 300개 제한으로 삭제된 이전 상태가 Cloudflare DO SQLite PITR에서 최대 30일 복원될 수 있음
- 운영 데이터: Turnstile pass 최대 24시간
- 파기: DO SQLite 자동 삭제와 orphan 정리
- 브라우저 저장: 임의 client key, 닉네임, 고지 버전, Turnstile pass token, 채팅을 한 번 열었는지 나타내는 `opened` 플래그
- 리액션 식별 가능성: DB snapshot만으로 메시지 간 actor token을 바로 연결하기는 어렵지만, 서버는 안정 식별 키로 현재 300개 안에서 같은 브라우저 신원의 반응 선택을 재계산할 수 있음
- 처리 위치와 수탁·국외 처리: Cloudflare, Vercel의 실제 계약·리전·로그 설정을 기준으로 별도 검토 및 고지
- 이용자 권리와 연락처: 개인정보처리방침에 개인정보 문의 연락처를 명시한다.
- 법령상 보존 요청이 있는 경우의 예외 절차와 접근 통제

개인정보 문의 연락처는 채팅 설정값이 아니라 사이트 개인정보처리방침에서 관리한다. 이용규칙에는 개인정보 노출, 사칭, 명예훼손, 불법정보, 투자 권유·리딩방, 링크·연락처 공유와 도배 금지를 명시한다.

운영상 또는 법령상 삭제가 필요한 경우에는 Cloudflare Access로 보호한 관리자 전용 삭제 API로 원문 행을 hard delete하고, 해당 원문을 인용한 답글 snippet도 비운다. 공개 신고·숨김·복구 기능은 제공하지 않는다. hard delete 뒤에도 공급자 PITR 복구 이력에는 위에 고지한 범위로 과거 상태가 남을 수 있다.

## 15. 비용과 용량 계획

2026-09-03 기준 Cloudflare Workers Free는 공개 Worker inbound request 일 100,000회 한도가 있고, Durable Objects도 별도로 compute 일 100,000 requests와 13,000 GB-s 포함량이 있으며 UTC 00:00, 한국 시간 09:00에 초기화된다. 인바운드 WebSocket 메시지는 DO compute request 과금에서 20:1로 환산되고 아웃바운드 WebSocket 메시지는 request 과금 대상이 아니다. SQLite는 별도로 일 5백만 row reads, 10만 row writes, 계정 총 5GB의 Free 포함량을 확인한다.

기존 “하루 약 4,100 요청” 수치는 트래픽 가정이 문서에 없어 확정값에서 제거한다. 브라우저가 보내는 Worker 요청과 cache miss 뒤의 DO 요청을 분리해 계산한다.

```text
온라인 배지 Worker requests/일
= Σ ceil(`standalone PWA && opened`인 실행 세션의 닫힌·visible 시간(초) / 60)

전체 Worker requests/일
= 온라인 배지 Worker requests
+ WebSocket upgrade 수
+ health·관리자 등 기타 HTTP requests

DO compute requests/일
= WebSocket 연결 수
+ /online Cache API miss 뒤 DO 호출 수
+ 기타 DO HTTP/RPC 요청 수
+ ceil(인바운드 WebSocket frame 수 / 20)
+ alarm 실행 수
```

온라인 배지는 standalone PWA에서 채팅을 한 번이라도 연 경우에만, 패널이 닫힌 visible 시간에 60초 주기로 호출한다. 일반 브라우저, PWA 실행 모드 판정 전, 신규 PWA 이용자와 패널이 열린 시간의 polling request는 0이다. 대상 PWA 세션의 평균 닫힌·visible 시간을 기준으로 한 예시는 다음과 같다.

| `standalone && opened` 대상 세션/일 | 평균 3분, 세션당 3회 | 평균 5분, 세션당 5회 |
| ---: | ---: | ---: |
| 1,000 | 3,000 requests | 5,000 requests |
| 5,000 | 15,000 requests | 25,000 requests |
| 10,000 | 30,000 requests | 50,000 requests |

Cache API hit도 Worker 코드는 실행되므로 위 Worker request 수 자체를 없애지는 않는다. 대신 hit에서는 DO stub을 호출하지 않아 단일 ChatRoom을 깨우지 않는다. 15초 TTL이 계속 유지되고 cache 축출이 없다는 이상적 조건에서는 한 데이터센터의 `/online` DO 호출이 연속 트래픽 기준 최대 `86,400 / 15 = 5,760회/일`이다. 실제 Cache API는 데이터센터별 로컬 캐시이고 축출될 수 있으므로 이를 전 세계 상한으로 사용하지 않으며, 실제 cache miss와 DO 호출 수를 계측한다. Worker 요청 예측이 일 70,000을 넘으면 온라인 수 제거를 우선 검토하고, 85,000을 넘으면 Paid 전환 대상으로 본다.

constructor는 SQL을 읽지 않으므로 `/online`과 `/health` cache miss가 DO를 깨워도 message row read는 0이다. 예를 들어 세 데이터센터에서 `/online` cache miss가 각각 하루 최대 5,760회 발생해 총 17,280회 DO를 호출하더라도 message row read는 `17,280 × 0 = 0`이다. DO 요청과 짧은 handler 실행 비용은 남지만 메시지 cache를 올리지 않고 처리 직후 다시 하이버네이션 가능 상태가 된다.

메시지 cache는 실제 채팅 동작에서 처음 `ensureMessagesLoaded()`를 호출할 때만 최대 300행을 읽는다. 채팅 동작 5,000개가 모두 서로 다른 퇴거·지연 로딩을 일으키는 보수적 최악값은 `5,000 loads × 300행 = 1,500,000 row reads/일`이다. 한 번 로드된 인스턴스에서는 `init`, `more`, 발언량 검사와 후속 변경이 같은 cache를 사용한다. 실제 예산은 `ensureMessagesLoaded 실행 횟수 × 복원 행 수`로 계산하고 load 횟수를 계측한다.

Cloudflare는 테이블 행뿐 아니라 변경된 index 행도 row write로 센다. 따라서 리액션을 별도 vote 행·unique index·message count UPDATE로 구현하면 40,000회만으로 대략 120,000 row writes가 되어 Free 한도를 넘는다.

v1은 리액션 actor token·mask와 count를 인덱싱하지 않은 message 행 하나에 함께 저장한다. 메시지당 actor entry를 99개로 제한해 매 toggle에서 다시 쓰는 JSON의 크기를 고정한다.

```text
리액션 40,000회/일 × message 행 1회 UPDATE
= 약 40,000 row writes/일

+ message INSERT/DELETE
+ nickname·settings 변경
```

secondary index와 별도 voter 행의 만료 DELETE도 없으므로 정상 규모에서는 10만 한도 안에 여유를 남긴다. 예를 들어 메시지 5,000개가 모두 스트림 포화 상태에서 교체돼도 INSERT와 DELETE는 약 10,000 writes다. 출시 전 staging에서 SQL cursor의 `rowsWritten`과 Cloudflare 내장 대시보드를 대조해 reaction toggle, message INSERT, message DELETE가 각각 목표 1 write인지 확인한다. 일 70,000 writes를 경고선, 85,000을 Paid 전환선으로 둔다.

관리자 삭제는 대상 1행과 이를 인용한 답글을 합쳐 최악 300 row writes를 만들 수 있지만 운영상 예외 동작이므로 일상 트래픽 계산에는 넣지 않고 실제 발생분을 그대로 계측한다.

- Free 유지 경보: row writes 70%, 85%; Worker requests 70%, 85%; DO compute requests 70%, 90%
- row writes 85% 도달: 기능을 임의 샘플링하지 않고 Paid 전환
- 한도 초과 시 조용히 데이터 유실시키지 않고 읽기 전용 상태와 장애 안내 표시
- Workers Paid는 계정당 월 최소 USD 5이며 포함량 이후 종량 과금이 있으므로 비용 상한과 알림을 설정

별도 관측성 저장소나 사용자 정의 지표 시스템은 v1에서 만들지 않는다. Cloudflare 내장 대시보드의 requests, duration, SQLite rows read/write, 오류율과 Access 로그로 시작한다. Worker 로그에는 메시지 본문, 닉네임, IP, UA, 식별 키, Turnstile token을 남기지 않는다.

장애 모드는 다음처럼 고정한다.

| 장애 | 동작 |
| --- | --- |
| Turnstile Siteverify 장애 | 기존 pass 허용, 신규 이용자는 읽기 전용 |
| DO write 실패 | 해당 변경 실패 처리, 성공 broadcast 금지 |
| DO overload | `1013 Try Again Later`, 클라이언트 백오프 |
| Free 한도 초과 | 읽기 가능 범위에서 읽기 전용 안내, 운영자 경보 |
| 잘못된 schema/frame | `err` 후 반복 시 `1008` 종료 |
| 팬아웃 중 개별 socket 오류 | 해당 socket만 정리, 전체 이벤트는 계속 처리 |

## 16. 출시 승인 기준

### 기능

- 일반 브라우저에서는 플로팅 버튼이 PWA 설치·실행 안내만 표시하고 `/online`, WebSocket, Turnstile 요청을 만들지 않는다.
- Android와 iOS의 standalone PWA 실행에서는 채팅 패널을 열 수 있고, 설치했더라도 일반 브라우저 탭에서는 채팅이 열리지 않는다.
- standalone 판정은 UX 이용 조건으로만 사용하며 이를 서버 인증이나 Turnstile 대체 수단으로 취급하지 않는다.
- 최신 50개, 50개 추가 조회, 최대 300개 경계가 순서·중복 없이 동작한다.
- 301번째 메시지 저장 시 가장 오래된 1개와 그 리액션 상태가 함께 삭제된다.
- 한국 시간 자정과 분기 `ACTOR_SECRET` 교체 후 표시용 anonId가 전환되며 기존 메시지에 누른 리액션을 계속 취소할 수 있는지 fake clock 테스트를 통과한다.
- 답글 원문이 스트림에서 이탈해도 단독으로 렌더링된다.
- 답글 작성 중 원문이 먼저 밀려나면 본문은 일반 메시지로 저장되고 `parentDetached` 안내가 전달된다.
- 선정성 표현은 발언을 거부하지 않고 일치 구간별 `🔞`로 치환되며 원문이 메시지·답글 snippet·닉네임 스냅샷에 남지 않는다.
- 리액션 toggle과 1초 변경 배치가 경쟁 상태 없이 동작한다.
- 메시지의 reaction actor가 99명에 도달하면 신규 actor만 거부되고 기존 actor의 변경·취소는 정상 동작한다.
- 같은 `rid` 재전송이 중복 메시지·리액션을 만들지 않는다.

### 보안·운영

- DO 강제 eviction 후 nickname, anonId, 인증 상태가 attachment에서 복원된다.
- eviction·재연결 후에도 리액션 중복과 발언·닉네임 제한이 유지된다.
- message 행에 `dailyActorKey`가 저장되지 않고 5분 `sayActorTag`가 bucket 경계에서도 rolling 60초 제한을 정확히 계산하는지 확인한다.
- join 없는 소켓이 10초 뒤 `4009`로 종료되고, Worker upgrade 속도 제한과 DO의 IP별 전체 20개·방 전체 500개·join 미완료 전체 100개 상한이 각각 동작한다.
- Origin 위조, XSS 문자열, 8 KiB 초과, 잘못된 JSON, Unicode 우회, 링크 우회 테스트를 통과한다.
- 선정성 사전의 직접 입력·구분자 우회·중첩 일치가 치환되고 정상 한국어 예외 단어는 오탐되지 않는 회귀 테스트를 통과한다.
- Turnstile 성공·실패·만료·재사용·timeout 시나리오를 공식 test key로 검증한다.
- 킬스위치를 재배포 없이 켜고 끄며 발언만 차단되는지 확인한다.
- Cloudflare Access 미인증 사용자가 모든 관리자 API에서 거부된다.
- 관리자 삭제가 대상 메시지를 제거하고 모든 답글 snippet과 연결된 클라이언트 상태를 함께 갱신하며, 같은 요청의 재시도가 멱등인지 확인한다.
- 개인정보처리방침, 이용규칙, 개인정보 문의 연락처와 국외 처리 검토가 완료된다.

### 성능·비용

- 동시 WebSocket 50개와 60초간 초당 100개 inbound frame에서 오류 없이 순서와 집계가 유지된다.
- 유휴 WebSocket만 남긴 상태에서 DO가 하이버네이션 가능 상태가 되는지 확인한다.
- 빈 리액션 tick과 애플리케이션 heartbeat가 발생하지 않고, 리액션 배치는 실제 변경된 메시지 count만 브로드캐스트한다.
- 리액션 toggle 1회가 정상 경로에서 row write 1회인지 확인하고 40,000회 시나리오의 총 row writes가 70,000 미만이다.
- 활성 DO에서 발언량 검사 1회당 추가 SQLite row read가 0인지 확인한다.
- `/online`의 Cache API hit에서는 DO 호출이 0이고, miss에서는 DO를 한 번 호출하되 `ensureMessagesLoaded()`와 SQLite를 전혀 호출하지 않는지 확인한다. Worker 요청 수, DO cache miss 수와 message cache load 수는 별도 지표로 확인한다.
- compute requests와 SQLite row reads/writes가 Cloudflare 내장 대시보드에서 확인된다.

## 17. 배포 시 주입할 값

정책 결정은 완료했지만 다음 값은 실제 계정과 도메인이 있어야 하므로 배포 체크리스트로 남긴다.

### Next.js / Vercel 공개 환경값

```ini
NEXT_PUBLIC_CHAT_API_URL=
NEXT_PUBLIC_CHAT_WS_URL=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

### Cloudflare Worker 비공개 환경값

```ini
CHAT_ALLOWED_ORIGINS=
ACTOR_SECRET=
ENFORCEMENT_SECRET=
IP_GUARD_SECRET=
PASS_SIGNING_SECRET=
TURNSTILE_SECRET_KEY=
TURNSTILE_EXPECTED_HOSTNAME=
CF_ACCESS_AUD=
ADMIN_EMAIL_ALLOWLIST=
```

Wrangler에는 `CHAT_UPGRADE_RATE_LIMITER` Rate Limiting binding을 별도로 선언하고 `limit = 30`, `period = 60`으로 설정한다. `namespace_id`는 실제 Cloudflare 계정에서 발급·관리한다.

## 18. 근거 문서

- [MDN: standalone PWA 생성과 display-mode 판정](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Create_a_standalone_app)
- [WebKit: iOS·iPadOS 홈 화면 웹 앱](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Cloudflare Durable Objects WebSocket 하이버네이션](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [Durable Object lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/)
- [SQLite-backed Durable Object Storage와 PITR](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
- [Durable Object data location](https://developers.cloudflare.com/durable-objects/reference/data-location/)
- [Durable Object pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Durable Object limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Workers Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
- [Cloudflare Workers Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [헌법재판소 2010헌마47등](https://isearch.ccourt.go.kr/view.do?eventNo=2010%ED%97%8C%EB%A7%8847&idx=00)
- [정보통신망법 제44조·제44조의2](https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=242879)
