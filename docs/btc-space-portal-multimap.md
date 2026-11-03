# BTC 스페이스 포탈·다중 맵 설계

> 버전: v0.1
> 기준일: 2026-11-03
> 상태: **설계 — 구현 착수 전.** 이 문서에 대응하는 코드는 아직 없다
> 결정: 맵마다 Durable Object 인스턴스를 분리한다(§1.2 의 B안)
> 선행 문서: `docs/btc-space-3d.md` (월드·이동·성능 규격)

섬 안에 포탈을 두고, 플레이어가 그 영역에 들어가면 다른 맵으로 이동하는 기능이다. 이 문서는 **무엇을 어떤 순서로 바꿀지**만 정한다. 좌표 1 유닛은 1 m, 시간은 초(s)다.

## 1. 목표와 결정

### 1.1 목표

- 섬의 특정 지점(포탈)에 들어가면 다른 맵으로 이동한다.
- 맵은 앞으로 계속 늘어난다. 두 번째 맵을 넣는 작업이 세 번째 맵에서 반복되지 않아야 한다.
- 닉네임·아바타 모델·색은 맵을 옮겨도 유지된다.

### 1.2 두 가지 안과 선택

| 항목 | A안: 한 월드 확장 | **B안: 방 분리 (채택)** |
| --- | --- | --- |
| 포탈의 정체 | 좌표 순간이동 | 접속할 방 교체 |
| Durable Object | 1개(`idFromName("main")`) | 맵마다 1개(`idFromName(mapId)`) |
| 좌석 50개 | 두 지역이 나눠 씀 | **맵마다 50개** |
| 프레임 프로토콜 | 변경 없음 | 변경 없음 |
| 높이 상한 | `y` 가 Uint16 cm·36 m 상한이라 **수직 적층 불가** | 맵마다 독립이라 제약 없음 |
| 서버 치트 검증 | **필요.** 포탈 좌표쌍을 서버가 알고 그 점프만 허용해야 함 | **불필요**(§5.4) |
| 렌더 비용 | 두 지역이 계속 씬에 있음 | 한 맵만 씬에 있음 |
| 전환 비용 | 없음(같은 연결) | 재접속 + GLB 로드(§6) |
| 공사 규모 | 작음 | 중간 — 월드 상수를 맵별 설정으로 빼는 리팩터가 핵심 |

B안을 택한 이유는 "진짜 다른 장소"를 계속 늘릴 계획이기 때문이다. 맵마다 좌석·지형·에셋·DO 가 독립이라 한 맵이 붐벼도 다른 맵이 영향을 받지 않고, 유휴 맵은 hibernation 으로 과금이 0 이다. A안의 이득(전환 비용 0)은 부속 공간 하나를 붙일 때만 유효하다.

## 2. 지금 구조에서 바꾸지 않아도 되는 것

착수 전에 확인한 사실이다. 이 네 가지가 성립하기 때문에 B안의 공사가 "중간" 규모에 머문다.

- **프레임 프로토콜 변경 없음.** 방을 업그레이드 URL 에서 고르므로 `SPACE_PROTOCOL_VERSION` 을 올릴 필요가 없다. 버전을 올리면 캐시된 구버전 PWA 클라이언트가 `UNSUPPORTED_VERSION` 으로 끊긴다 — 그 비용을 치르지 않는다.
- **스냅샷 포맷 변경 없음.** 좌표는 맵 안에서만 의미가 있다. x·z 는 Int16 cm(±327 m), y 는 Uint16 cm 에 상한 36 m 인데, 맵마다 독립이므로 맵 하나가 그 범위를 넘지 않으면 된다.
- **wrangler migration 불필요.** 새 클래스가 아니라 같은 `SpaceRoom` 클래스의 다른 인스턴스다. `wrangler.jsonc` 의 `migrations` 는 그대로 둔다.
- **DO 가 자기 맵을 알 수 있다.** `DurableObjectId.name` 이 타입에 있다(`node_modules/@cloudflare/workers-types/index.d.ts:645`). `idFromName(mapId)` 로 만든 인스턴스는 `this.state.id.name` 으로 맵 id 를 읽는다. URL 경로로 넘겨도 되지만, 이름 쪽이 "방이 자기 정체를 안다"에 더 가깝다.

## 3. 맵 레지스트리 — 가장 큰 작업

### 3.1 지금 모듈 상수인 것들

`src/entities/space/model/spaceWorld.ts` 의 아래 값들이 "섬 하나"를 전제한 모듈 상수다. **Worker 가 이 파일을 직접 import 한다**(`workers/chat/src/SpaceRoom.ts:17-21`). 맵별 설정으로 빼면 서버와 프론트가 같은 소스를 계속 공유할 수 있다.

| 상수 | 위치 | 맵별 여부 |
| --- | --- | --- |
| `SPACE_MAX_OCCUPANTS` | `spaceWorld.ts:16` | 공통(50) 유지. 맵별로 다르게 할 이유가 아직 없다 |
| `SPACE_ISLAND` | `spaceWorld.ts:26` | **맵별** — 층 높이는 지형의 성질이다 |
| `SPACE_MAX_ALTITUDE` | `spaceWorld.ts:55` | **맵별** — 스냅샷 `y` 상한(36 m)을 넘지 않는 선에서 |
| `SPACE_BOUNDS` | `spaceWorld.ts:68` | **맵별** — 서버 이동 검증의 근거 |
| `SPACE_SPAWN_RING` | `spaceWorld.ts:117` | **맵별** |
| `SPACE_SPAWN_FACING` | `spaceWorld.ts:141` | **맵별** |
| `SPACE_OVERLAY_LIMITS.nameplateMaxDistance` | `spaceWorld.ts:244` | **맵별** — 맵 대각선에서 파생되는 값이다 |

### 3.2 설정의 모양

구현이 아니라 합의할 형태다. 한 맵을 설명하는 데 필요한 최소값만 담는다.

```ts
interface SpaceMapConfig {
  id: "island" | ...;        // URL 과 DO 이름에 그대로 쓰인다
  label: string;             // HUD·전환 화면 표기
  modelUrl: string;          // 지형 GLB
  bounds: { minX; maxX; minZ; maxZ };
  maxAltitude: number;       // 스냅샷 y 상한(36) 이하
  spawn: { ring; facing };
  portals: readonly SpacePortal[];
}
```

`SPACE_AVATAR_MODELS` 가 이미 "목록 + 인덱스로 조회" 패턴을 쓰고 있으므로 선례를 따른다. 조회 함수는 알 수 없는 id 에 기본 맵을 돌려주지 않고 **실패**해야 한다 — 기본값으로 때우면 서버가 엉뚱한 경계로 이동을 검증한다.

### 3.3 공유 경계

맵 설정은 `src/entities/space` 에 둔다. Worker 가 상대 경로로 import 하는 현 구조를 그대로 쓰면 서버·클라이언트가 같은 경계값을 본다. 설정을 Worker 쪽에만 두면 클라이언트 이동 적분기와 서버 검증이 갈라진다.

## 4. 접속 경로와 방 선택

### 4.1 URL

`/v1/space/ws/:mapId` 로 맵을 경로에 넣는다. 지금은 `/v1/space/ws` 한 경로다(`workers/chat/src/index.ts:244`).

쿼리(`?map=`)가 아니라 경로인 이유는 **업그레이드 리미터 키가 경로를 포함**하기 때문이다(`index.ts:160`, 키는 `${ipGuardKey}:/v1/${room}/ws`). 경로에 맵이 들어가면 맵마다 30회/60초 예산이 따로 잡혀 포탈 왕복에 유리하다.

### 4.2 검증

- 맵 id 는 레지스트리 allowlist 로만 받는다. 모르는 id 는 DO 를 만들지 않고 거절한다 — `idFromName` 은 어떤 문자열로도 방을 만들어 주므로, 검증을 빼면 아무나 새 방을 무한히 만든다.
- 클라이언트는 `resolveSpaceWebSocketUrl`(`src/shared/config/space.ts:5`)에 맵 id 를 받아 경로를 만든다.

### 4.3 기존 경로

`/v1/space/ws` 는 섬으로 넘기는 별칭으로 남긴다. 캐시된 구버전 클라이언트가 계속 들어와야 한다.

## 5. 포탈

### 5.1 정의

포탈은 맵 설정 안에 있다. 트리거는 월드 좌표 + 반경 + 목적지 맵 id 로 충분하다. 수직 판정도 필요하다 — 섬은 층이 여러 개라 포탈 위를 지나가는 다리에서 끌려 들어가면 안 된다.

### 5.2 진입 판정

이동 적분기(`stepMovement`, `src/features/space-controls/model/movement.ts:242`)가 확정한 좌표로 판정한다. 입력이 아니라 **결과 좌표**를 봐야 한다 — 벽에 막혀 못 들어간 프레임에 포탈이 발동하면 안 된다.

### 5.3 쿨다운 — 필수

5초. 리미터가 맵별 30회/60초이므로, 왕복 1회는 두 맵 예산을 각각 1회씩 쓴다. 5초 쿨다운이면 1분에 최대 12회라 여유가 있다. 쿨다운이 없으면 `f9aff9e9` 에서 고친 **자기 지속형 락아웃을 그대로 재현한다** — 리미터는 거절한 요청도 창에 쌓으므로, 사유를 모르는 클라이언트가 계속 올라오면 락아웃이 스스로 길어진다.

도착 직후에도 쿨다운을 적용한다. 양쪽 포탈이 서로 마주 보면 도착하자마자 되돌아가는 왕복이 생긴다.

### 5.4 서버 검증이 필요 없는 이유

A안과 달리 포탈은 "어느 방에 접속할지"의 문제다. 클라이언트가 포탈까지 걸어가지 않고 바로 다른 맵 URL 로 접속해도, **도착 맵의 스폰 지점에서 시작하고 각 맵은 자기 경계만 검증한다.** 최악이 "URL 로 맵 고르기"이고 좌표 치트 통로가 되지 않는다. 서버에 포탈 좌표를 둘 필요가 없다.

## 6. 전환 절차

1. 포탈 진입 판정(§5.2). 쿨다운 중이면 무시한다.
2. 입력을 잠그고 전환 화면을 띄운다. 이 순간부터 이동 프레임을 보내지 않는다.
3. 기존 방에 `close(1000)` 을 보낸다. **좌석이 즉시 반납된다** — 안 보내면 떠난 맵에서 최대 60초(`STALE_CONNECTION_MS`) 동안 좌석과 IP 슬롯을 점유한다.
4. 도착 맵 GLB 를 로드한다. 섬은 0.57 MB Draco 다. `useLoader.preload`(`src/views/space/lib/islandModel.ts:150`)와 같은 방식으로 **포탈에 접근하는 동안 미리** 받아두면 전환 체감이 줄어든다.
5. 새 방에 접속한다. `welcome` 을 받으면 스폰 좌표로 들어간다.
6. 실패하면 전환 화면에 사유를 띄우고 **떠난 맵으로 돌아간다.** 어느 방에도 못 들어간 상태로 남기지 않는다.

### 6.1 재접속과 오류의 구분

지금 컨트롤러는 모든 재접속을 오류로 다룬다(`spaceSessionController.ts:439` 의 `connect`, 그리고 `handleDisconnected` 가 띄우는 메시지). 포탈 전환은 **의도된 재접속**이라 "스페이스 연결이 끊겼어요" 가 떠서는 안 된다. 전환 플래그를 두고 그 경로에서는 오류 메시지를 띄우지 않는다.

### 6.2 컨트롤러 재생성

`useSpaceSession` 의 컨트롤러는 `useMemo` 의존성이 `[identity.clientKey]` 뿐이다(`src/features/space-session/model/useSpaceSession.ts:34`). **맵 id 를 의존성에 넣지 않으면 `webSocketUrl` 이 바뀌어도 맵 전환이 반영되지 않는다.** 닉네임·모델을 의존성에서 뺀 이유(이름을 바꿀 때 연결이 끊기는 것을 막기 위함)와 달리, 맵은 연결을 새로 세우는 것이 목적이므로 의존성에 들어가는 쪽이 맞다.

## 7. 코드 변경 지점

| 파일 | 변경 |
| --- | --- |
| `src/entities/space/model/spaceWorld.ts` | 월드 상수를 맵별 설정으로 분리(§3.1) |
| `src/entities/space/model/spaceMap.ts` (신규) | 맵 레지스트리와 조회 함수 |
| `src/entities/space/lib/spawnPoint.ts:46` | `createSpawnPoint(clientKey)` 가 맵 설정을 받는다 |
| `workers/chat/src/SpaceRoom.ts:17-21` | 모듈 상수 import 를 맵 설정 조회로. `MAXIMUM_MOVEMENT_BUDGET` 도 맵별 |
| `workers/chat/src/index.ts:244` | 경로에서 맵 id 를 읽어 검증 후 `idFromName(mapId)` |
| `src/shared/config/space.ts:5` | `resolveSpaceWebSocketUrl` 이 맵 id 를 받는다 |
| `src/features/space-session/model/useSpaceSession.ts:34` | 맵 id 를 컨트롤러 의존성에 추가 |
| `src/features/space-session/api/spaceSessionController.ts` | 전환용 재접속 경로(오류 아님) |
| `src/features/space-controls/model/movement.ts:242` | 결과 좌표로 포탈 진입 판정 |
| `src/views/space/lib/islandModel.ts:18` | 하드코딩된 `ISLAND_MODEL_URL` 을 맵별 모델로 |
| `src/views/space/ui/scene/*` | 맵별 지형·조명 전환, 포탈 비주얼 |
| `src/views/space/ui/SpaceCanvas.tsx` | 전환 화면과 입력 잠금 |

## 8. 리스크와 대응

| 리스크 | 대응 |
| --- | --- |
| 전환 체감이 느리다(재접속 + GLB) | 포탈 접근 중 프리로드(§6 4번), 전환 화면 필수 |
| 포탈 왕복이 리미터를 태운다 | 쿨다운 5초, 경로별 리미터 키(§4.1), 도착 직후에도 쿨다운(§5.3) |
| 떠난 맵에 유령 좌석이 남는다 | 전환 시 명시적 `close(1000)`(§6 3번) |
| 맵이 늘수록 상수 누락이 생긴다 | 조회 함수가 알 수 없는 id 에 실패한다(§3.2). 기본값으로 때우지 않는다 |
| 섬 이주 때처럼 "바닥은 0" 가정이 또 남는다 | 맵별 설정에서 읽지 않고 상수를 쓰는 곳을 리뷰에서 본다. 전례가 세 군데였다(걷기 모션·명찰 거리·그림자 높이) |

## 9. 비용 (Cloudflare 무료 플랜)

- Durable Objects 무료 한도는 **요청 100,000/일**(WebSocket 수신 메시지는 20:1 로 계산), **duration 13,000 GB-s/일**, 리셋은 00:00 UTC(한국시간 오전 9시)다.
- 유휴 맵은 hibernation 으로 과금이 0 이다. 지금 설계(`setWebSocketAutoResponse` 로 ping 응답, 유휴 상시 틱 없음)를 맵마다 그대로 유지한다.
- DO 하나가 24시간 깨어 있으면 약 11,000 GB-s 다. **두 맵이 동시에 종일 붐비면 한도를 넘는다.** 맵을 늘리는 것 자체보다 "동시에 활성인 맵 수"가 비용을 정한다.

## 10. 작업 순서

구현은 아래 순서로 나눈다. 1~2 가 끝나면 맵이 하나뿐인 상태에서도 모든 테스트가 통과해야 한다 — 그 상태를 커밋 경계로 둔다.

1. 맵 레지스트리 신설 + 월드 상수 이전. 섬 하나만 등록해 **동작 변화 없이** 리팩터를 끝낸다.
2. Worker 의 맵별 방 선택과 검증. 기존 경로 별칭 유지(§4.3).
3. 클라이언트 맵 전환 경로(컨트롤러 의존성, 전환용 재접속, 전환 화면).
4. 포탈 트리거와 쿨다운. 목적지를 섬 자신으로 두고 왕복을 먼저 검증한다.
5. 두 번째 맵 에셋 투입.

## 11. 미결 사항

- 두 번째 맵의 정체(장소·크기·층 구성)와 지형 GLB. 이것이 없으면 §3.2 의 설정 값을 채울 수 없다.
- 포탈의 생김새와 피드백(소리·파티클). 섬 GLB 에 노드를 넣을지, 코드로 그릴지.
- 맵 사이의 인원 표시. "다른 맵에 몇 명 있는지" 를 보여줄 거면 맵별 접속 수를 모으는 경로가 따로 필요하다. 지금 `/v1/chat/online` 은 채팅 전용이다.
- 포탈을 탄 사람이 같은 맵의 다른 사람에게 어떻게 보일지. 지금은 그냥 `leave` 다.
