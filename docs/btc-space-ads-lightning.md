# BTC 스페이스 라이트닝 광고 개발 계획서

> 버전: v0.7
> 기준일: 2026-11-01
> 상태: 범위 축소 확정 (텍스트 배너 우선), 구현 착수 가능
> 상위 규격: [`btc-space-3d.md`](./btc-space-3d.md) §6.6 · §7 · §12
> 1차 범위: **전광판 위 텍스트 배너 1슬롯**을 라이트닝 결제로 판매
> 2차 범위: 좌·우 이미지 패널 2슬롯 (§10)

`/space` 에는 광고가 걸릴 자리가 셋 있다. 좌·우 이미지 패널(6 × 4)과 전광판 위 텍스트 배너(9.6 × 0.8)다. **1차에서는 텍스트 배너만 판다.**

## 1. 왜 텍스트부터인가

v0.5 까지는 세 슬롯을 한 번에 열고 예약·사전 심사·홀드를 모두 설계했다. 작업 26개, 상태 9개였다. 복잡도의 원인은 셋이 서로 물려 있었기 때문이다.

| 원인 | 파생된 복잡도 |
| --- | --- |
| 환불 불가 (비수탁 Blink) | 사전 심사 → 승인 후 재방문, 조회 토큰, 결제 시한, 늦은 입금 재배치 |
| 시작 시각 선택 | 5분 홀드, 경합 처리, `exclude` 제약, 만료 홀드 정리, 타임라인 선택 모드 |
| 이미지 업로드 | R2 presign, sharp 재인코딩, CORS·CSP, 이미지 수동 심사 |

텍스트만 팔면 **세 번째가 통째로 사라지고, 첫 번째도 사라진다.** 텍스트는 기존 `textValidation.ts` 와 선정성 필터로 **자동 검증**이 되므로 사람이 보는 사전 심사가 필요 없고, 사전 심사가 없으면 결제를 1단계에 둘 수 있다. 결제가 1단계면 승인 대기·재방문·조회 토큰이 전부 필요 없다.

남는 복잡도는 두 번째뿐인데, 그마저 **대기열(맨 뒤에 붙이기)** 로 두면 홀드가 사라진다. 시작 시각을 고르지 못하는 대신 설계가 1/3 로 줄어든다. 이미지와 시간 지정은 1차가 돌아가는 걸 보고 2차에서 붙인다(§10).

## 2. 확정값

| 항목 | 값 |
| --- | --- |
| 판매 슬롯 | `text_banner` 1개 (전광판 위, 9.6 × 0.8) |
| 문구 | 최대 **40 grapheme**, 한 줄 |
| 과금 | **시간 단위**, sats 고정가. 40 sats/시간 (§5) |
| 기간 | 프리셋 6종 (1h · 6h · 24h · 72h · 7d · 30d) |
| 결제 | Blink 비수탁 계정 `onlybtcapp@blink.sv` 의 LNURL-pay |
| 인보이스 | 주문당 1장, **만료 5분**(`expiry=300`). 미결제 시 주문 폐기 |
| 심사 | **자동 검증만.** 사전 수동 심사 없음. 운영자는 사후 중단권을 가진다(§6) |
| 노출 시작 | 결제 확정 시점. 앞 광고가 있으면 그 종료 시점(대기열) |
| 환불 | 없음 |
| DB | Supabase Postgres 1테이블. 클라이언트 직접 접근 없음 |
| 관리자 | **없음.** 인증·화면·라우트를 두지 않는다. 중단은 Supabase 대시보드에서 직접 한다(§6.1) |

## 3. 흐름

```text
[광고주]  /space 우측 상단 [광고] 버튼
   │
   ├─ 1단계  기간 선택      1h · 6h · 24h · 72h · 7d · 30d   + 현황 스트립
   ├─ 2단계  문구 입력      40자. 기존 필터로 즉시 검증
   └─ 3단계  결제           QR + 5분 카운트다운
                              ├─ 결제됨 → 대기열 뒤에 배치 → 노출
                              └─ 5분 경과 → 주문 폐기 (인보이스도 만료)

[운영자]  Supabase 대시보드 (서비스 자체 로그인)
   └─ ad_text_orders 행을 status='stopped' 로 수정 → 30~90초 안에 화면에서 사라짐
```

상태는 **5개**다.

| 상태 | 뜻 |
| --- | --- |
| `pending_payment` | 인보이스 발급됨. 5분 안에 결제되지 않으면 끝 |
| `queued` | 결제 확정. 앞 광고가 끝나기를 기다린다 |
| `active` | 노출 중 |
| `expired` | 기간 종료 |
| `stopped` | 운영자가 중단 |

`queued` 와 `active` 는 **구간(`starts_at`·`ends_at`)이 결제 시점에 확정**되므로, 실제 노출 판정은 조회 시 `now` 비교로 한다. 즉 `queued` → `active` 전이를 돌리는 작업이 따로 없다.

## 4. 아키텍처

```text
[광고주 브라우저]
  SpaceHud [광고] → SpaceAdDialog
    ├─ GET  /api/space/ads/text/timeline   현황(1행 스트립)
    ├─ POST /api/space/ads/text/orders     문구·기간 검증 → 인보이스 발급
    └─ GET  /api/space/ads/text/orders/:id/payment   verify 폴링(2초)

[Next.js Route Handler]  ← 유일한 DB·LNURL 접근 지점
    ├─ Supabase (service role key)
    └─ blink.sv LNURL (서버→서버)

[노출]
  SpaceScene ─ TanStack Query(60s) ─ GET /api/space/ads/text
    └─ TextAdBanner   (없으면 기존 플레이스홀더)

[백스톱]
  workers/chat 에 cron "* * * * *" 추가
    └─ pending_payment 의 미결 인보이스 verify 재확인 → 확정
```

| 경로 | 역할 |
| --- | --- |
| `src/entities/space-ad/model/` | 가격·기간 상수, 대기열 시작 시각 계산 (순수) |
| `src/entities/space-ad/lib/` | 문구 검증, bolt11 디코드·검증 (순수) |
| `src/entities/space-ad/server/` | Supabase 쿼리, LNURL 클라이언트 (서버 전용) |
| `src/features/space-ad-order/` | 주문 다이얼로그 3단계, 결제 폴링 훅 |
| `src/app/api/space/ads/text/**` | Route Handler |

**Worker 를 새로 만들지 않는다.** 기존 `workers/chat` 에 cron 트리거만 더한다. 배포 대상이 늘면 운영 부담도 늘고, 하는 일이 "분당 몇 건 조회" 뿐이라 분리할 이유가 없다.

## 5. 가격

| 기간 | 할인 | 금액 | 원화 참고 |
| --- | --- | --- | --- |
| 1시간 | — | **40 sats** | 약 52원 |
| 6시간 | 5% | 230 sats | 약 300원 |
| 24시간 | 10% | 860 sats | 약 1,120원 |
| 72시간 | 15% | 2,450 sats | 약 3,190원 |
| 7일 | 20% | 5,380 sats | 약 7,000원 |
| 30일 | 30% | 20,160 sats | 약 26,200원 |

- **sats 고정가**다. 원화 연동은 5분 인보이스 안에서도 환율이 움직여 "본 가격 ≠ 결제 금액" 을 만든다. 화면의 원화는 기존 `useBitcoinStore` 로 환산한 참고값이며 1 sat ≈ 1.3원(BTC 1.3억원) 기준이다.
- 라이트닝의 강점이 소액이므로 1시간권을 커피값 아래로 뒀다.
- 단가·할인은 `model/adPricing.ts` 한 곳에 상수로 두고 순수 함수로 계산한다.
- 기간은 프리셋 6종만 판다. 임의 입력을 받으면 할인 경계와 대기열 계산만 복잡해진다.

## 6. 심사를 자동 검증 + 사후 중단으로 바꾼 근거

사전 수동 심사를 뺀 대신 **세 겹**으로 막는다.

| 겹 | 수단 |
| --- | --- |
| 입력 | 40 grapheme 상한, 한 줄, 제어문자·연속 공백 정규화 |
| 금지 | 기존 `textValidation.ts` 의 링크·연락처 차단, `adultTerms.ko.ts` 선정성 필터 |
| 사후 | 운영자가 **Supabase 대시보드에서 중단**. 조회 캐시가 돌면 플레이스홀더로 돌아간다(§6.1) |

자동 검증은 우회될 수 있다. 필터를 통과한 혐오·사칭·정치 문구가 공개 공간에 걸릴 가능성은 **남는 위험으로 인정하고 받는다.** 1차 범위가 "한 줄 텍스트 1슬롯" 이라 최악의 피해가 제한적이고, 운영자가 `/space` 에 들어가면 바로 보이며 중단이 한 번의 클릭이기 때문이다. 이미지는 같은 논리가 성립하지 않아 2차로 미뤘다(§10).

- **위반으로 중단된 주문은 환불하지 않는다.** 약관에 적는다.
- 운영자 판단 착오로 중단한 경우만 수동 보상 대상이다. 비수탁 계정은 송금 API 가 없어 자동 환불이 불가능하다.
- 중단할 때 `stop_reason` 을 함께 적는다. 기록이 없으면 문의가 와도 확인할 방법이 없다.

### 6.1 관리자 인증·화면을 두지 않는다

운영자가 한 명이고 할 일이 "중단" 하나뿐이라, 그걸 위해 **인증 체계를 만들지 않는다.** 관리자 라우트도, 토큰도, 화면도 두지 않는다. 인증이 필요한 엔드포인트가 아예 없으면 그 엔드포인트가 뚫릴 일도 없다.

중단은 **Supabase 대시보드에서 해당 행을 직접 고친다.**

```sql
update ad_text_orders
   set status = 'stopped', stopped_at = now(), stop_reason = '<사유>'
 where id = '<uuid>';
```

| 항목 | 내용 |
| --- | --- |
| 인증 주체 | Supabase 계정 로그인. 우리 코드가 책임지지 않는다 |
| 반영 속도 | 조회 응답 `s-maxage=30` + 프런트 폴링 60초 → **최대 90초** |
| 대상 찾기 | 대시보드 테이블 편집기에서 `status='active'` 행 하나를 보면 된다 |

대가는 **운영자가 Supabase 에 로그인할 수 있어야 한다**는 것이다. 외부에서 급히 내려야 할 때 모바일로 대시보드를 열어야 한다. 중단 빈도가 낮을 것으로 보고 그 불편을 받는다. 빈도가 실제로 높아지면 그때 토큰 하나짜리 중단 라우트를 붙이는 쪽이, 쓰지도 않을 관리자 체계를 미리 만드는 것보다 낫다.

노출 판정이 조회 시 `now` 와 `status` 비교라서(§3) **DB 한 줄만 고치면 끝이다.** 캐시를 무효화하거나 다른 곳을 같이 손댈 필요가 없다.

## 7. 결제

### 7.1 실측으로 확인된 사실 (2026-11-01)

수신 주소 `onlybtcapp@blink.sv` 로 직접 호출해 확인했다. **비수탁 Blink 계정에는 API 키도 웹훅도 없고 수신 전용이다.** 그래서 Blink 가 자기 플러그인에서 쓰는 LNURL 경로를 쓴다.

| 항목 | 실측값 |
| --- | --- |
| LUD-16 조회 | `GET https://blink.sv/.well-known/lnurlp/onlybtcapp` → `callback`, `minSendable`, `maxSendable`, `commentAllowed` |
| callback | `https://lnurl.blink.sv/lnurlp/blink.sv/onlybtcapp/invoice` |
| 금액 범위 | `minSendable` 1,000 msat(1 sat) ~ `maxSendable` 50,000,000,000 msat. 40 sats 는 여유 있게 들어간다 |
| `commentAllowed` | 255자 → 주문 ID 를 코멘트에 실을 수 있다 |
| 응답 키 | `pr`(bolt11) · `routes` · **`verify`**(LUD-21) |
| `verify` 경로 | `https://lnurl.blink.sv/verify/{payment_hash}` — bolt11 에서 뽑은 해시와 일치함을 확인 |
| 미결제 응답 | `{"status":"OK","settled":false,"preimage":null,"pr":"lnbc…"}` |
| 기본 만료 | 2,592,000초(30일) |
| **`expiry` 파라미터** | 동작함. 30초~5,184,000초를 요청값 그대로 반영하고 `verify` 도 계속 온다. `abc`·`-1` 은 HTTP 400 |

### 7.2 발급

```text
POST /api/space/ads/text/orders   { durationHours, body }
  1. 문구·기간 검증 (실패 시 400, 인보이스 만들지 않음)
  2. GET {lnurlp}            → callback·min·max 확인
  3. GET {callback}?amount={msat}&expiry=300&comment={orderId}
  4. bolt11 디코드           금액 == 견적, payment_hash == verify 경로 조각
  5. 실제 만료를 저장        요청한 300초가 아니라 디코드값
  6. pending_payment 로 저장 → { orderId, paymentRequest, expiresAt, priceSats }
```

`expiry` 는 **LUD-06 표준에 없는 Blink 서버의 확장**이다. 예고 없이 사라질 수 있으므로 요청값을 믿지 않고 발급된 bolt11 의 만료를 저장하고, 카운트다운도 그 값으로 그린다.

재발급 경로는 없다. 5분 안에 결제하지 않으면 주문은 그대로 버려지고, 다시 사려면 처음부터 한다. 재발급을 허용하면 유효한 인보이스가 여러 장 생겨 이중 결제가 가능해지고, 비수탁 계정은 환불 수단이 없다.

### 7.3 확인

```text
GET /api/space/ads/text/orders/:id/payment     (프런트 2초 폴링 + cron 1분 백스톱)
  → GET {verify}
     settled: false  → 아직
     settled: true   → · sha256(preimage) == payment_hash
                        · 인보이스 금액 == 주문 금액
                        · 트랜잭션 안에서 queued 로 전이하고 구간 확정
```

- `starts_at = max(now 다음 정시, 마지막 점유 종료 시각)`, `ends_at = starts_at + duration`.
- **겹침은 DB 가 막는다**(§8). 두 건이 동시에 확정되려 해도 하나만 통과하고, 거절된 쪽은 구간을 다시 계산해 재시도한다.
- `payment_hash` 에 unique 제약을 둔다. 폴링과 cron 이 같은 결제를 동시에 봐도 구간이 두 번 잡히지 않는다.
- `status: ERROR` 와 네트워크 실패는 "미결제" 와 구분해 재시도 대상으로 둔다. 조회 실패를 미결제로 간주하면 되는 일이 없다.
- preimage 검증을 건너뛰지 않는다. `settled` 플래그만 믿으면 응답을 가로채는 쪽에 기대는 설계가 된다.
- 인보이스 만료 후 **10분까지** 확인을 계속한다. 만료 직전 스캔된 QR 이 뒤늦게 정산되는 경합을 덮는다. 그 뒤에 들어온 입금은 `late_payment` 로 기록하고 운영자 수동 처리로 올린다 — 금액이 작고 발생 확률이 낮아 자동화하지 않는다.

## 8. DB

```sql
create type ad_text_status as enum ('pending_payment', 'queued', 'active', 'expired', 'stopped');

create table ad_text_orders (
  id               uuid primary key default gen_random_uuid(),
  status           ad_text_status not null default 'pending_payment',
  body             text not null,
  duration_hours   int  not null check (duration_hours in (1, 6, 24, 72, 168, 720)),
  price_sats       int  not null check (price_sats > 0),
  -- 결제
  payment_hash     text not null unique,
  payment_request  text not null,
  verify_url       text not null,
  invoice_expires_at timestamptz not null,
  settled_at       timestamptz,
  preimage         text,
  -- 노출 (결제 확정 시 채운다)
  starts_at        timestamptz,
  ends_at          timestamptz,
  check (starts_at is null or date_trunc('hour', starts_at) = starts_at),
  -- 운영
  stopped_at       timestamptz,
  stop_reason      text,
  submit_ip_hash   text not null,
  created_at       timestamptz not null default now()
);

-- 노출 구간이 겹치지 않게 DB 가 직접 막는다.
create extension if not exists btree_gist;
alter table ad_text_orders add constraint ad_text_orders_no_overlap
  exclude using gist (tstzrange(starts_at, ends_at) with &&)
  where (status in ('queued', 'active'));

alter table ad_text_orders enable row level security;  -- 정책 없음 = anon 키로 아무것도 못 읽음
```

- 겹침 방지를 애플리케이션 코드에 맡기지 않는다. 제약 한 줄이 동시 결제 경합을 막는다.
- RLS 는 켜고 정책을 두지 않는다. 접근은 service role 키를 가진 Route Handler 뿐이다. 공개 조회도 서버가 대신 읽어 필요한 필드만 내려보낸다.
- IP 는 원문을 저장하지 않고 프리픽스 해시만 남긴다. 기존 채팅 Worker 와 같은 방식이다.
- 금액은 `int` sats 다. 돈에 부동소수점을 쓰지 않는다.

## 9. 라우트와 UI

### 9.1 라우트

| 메서드·경로 | 인증 | 역할 |
| --- | --- | --- |
| `GET /api/space/ads/text` | 없음 | 현재 노출 문구 1건. `s-maxage=30` |
| `GET /api/space/ads/text/timeline` | 없음 | 앞으로 48시간 점유 구간 + 다음 빈 시각. `s-maxage=30` |
| `POST /api/space/ads/text/orders` | 없음 (IP 레이트리밋) | 검증 → 인보이스 발급 |
| `GET /api/space/ads/text/orders/:id/payment` | 주문 ID | verify 확인 → 확정 |

**인증이 필요한 라우트가 없다.** 관리자 기능은 Supabase 대시보드가 맡는다(§6.1).

- 주문 ID 는 UUID 이고 그 자체가 조회 키다. 별도 서명 토큰을 두지 않는다 — 주문에 담긴 정보가 "내가 방금 쓴 문구와 QR" 뿐이라 유출돼도 피해가 없다.
- 공개 POST 는 IP 프리픽스 해시로 10분 3건으로 제한한다. 인증이 없으므로 이 제한이 유일한 남용 방어선이다.

### 9.2 다이얼로그

우측 상단 `SpaceActionBar` 에 액션 하나(`space-ad`)를 추가한다. 기존 묶음(뒤로·채팅·닉네임·안내)과 같은 방식이라 레이아웃이 바뀌지 않는다.

| 단계 | 내용 |
| --- | --- |
| 1. 기간 | 프리셋 6개 + 금액(sats·원화). 위에 현황 스트립 |
| 2. 문구 | 40자 입력. 남은 글자수와 검증 오류를 즉시 표시 |
| 3. 결제 | QR + bolt11 복사 + 5분 카운트다운. 결제되면 "11/03 14:00 부터 노출" 안내 |

모바일에서는 채팅과 같은 **하단 시트**로 띄운다. `SpaceChatPanel` 의 `isBottomSheet` 처리를 따른다. 열려 있는 동안 조이스틱·점프 버튼은 내리고 키보드 이동을 막는다 — 채팅·닉네임 편집과 같은 규칙이다.

### 9.3 현황 스트립

```text
        now    +12h    +24h    +36h   +48h
 텍스트 ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░
        ▓ 예약됨  ░ 비어 있음

 → 다음 빈 시각: 11/02 06:00 (2건 대기)
```

1칸 = 1시간, 기본 48시간. 단일 슬롯이라 1행이면 충분하다. **읽기 전용이다** — 시작 시각을 고르지 않으므로 터치 입력을 받지 않는다. 모바일 300 px 에서 칸당 6 px 이라 혼잡도만 읽히면 된다.

스크린리더에는 칸을 48번 읽히지 않게 행 단위 `aria-label` 요약만 준다: "앞으로 48시간 중 12시간 예약됨, 다음 빈 시각 11월 2일 6시".

### 9.4 노출 연결

`SpaceScene` 이 `GET /api/space/ads/text` 를 TanStack Query 로 60초마다 읽어 `TextAdBanner` 에 넘긴다. 시간 단위 상품이라 60초 지연은 문제가 되지 않는다. 응답이 비면 기존 플레이스홀더를 그린다. 광고 노출 스위치(`NEXT_PUBLIC_SPACE_ADS_ENABLED`)가 꺼져 있으면 조회도 하지 않는다.

`linkUrl` 은 1차 범위에 없다. 문구만 판다.

## 10. 2차 범위로 미룬 것

| 항목 | 미룬 이유 | 되살릴 때 필요한 것 |
| --- | --- | --- |
| 이미지 패널 2슬롯 | 자동 검증이 불가능해 수동 심사가 필요하고, 그게 사전 심사·결제 순서·환불 문제를 전부 되살린다 | R2 presign + sharp 재인코딩 + CORS·CSP, 심사 화면, "소재 통과까지 교체 가능한 이용권" 모델 |
| 시작 시각 지정 | 홀드·경합·만료 정리·타임라인 선택 모드가 붙는다 | `payment_holding` 상태, `hold_expires_at`, 시작 시각 칩 |
| 프라임 타임 할증 | 시간 지정이 없으면 의미가 없다 | 시간대별 단가표 |
| 클릭 링크 | 3D 안 클릭 판정 또는 HUD 광고 목록이 필요하다 | 링크 심사·호스트 표기 |
| 승인·반려 알림 | 사전 심사가 없으니 알릴 것이 없다 | 연락처 수집과 발송 수단 |

v0.5 의 상세 설계는 git 이력에 남아 있다. 2차 착수 시 그 문서를 기준으로 되살린다.

## 11. 작업 목록

상태 값: `대기` · `진행중` · `완료` · `보류`

| # | 작업 | 산출물 | 상태 |
| --- | --- | --- | --- |
| 3-0 | LNURL·`verify`·금액·`expiry` 실측 확인 | §7.1 | **완료** |
| 3-1 | Supabase 프로젝트·스키마·RLS·`exclude` 제약 | `supabase/migrations/*.sql` | 대기 |
| 3-2 | 환경변수·설정 모듈 | `shared/config/spaceAds.ts`, `.env.example` | 대기 |
| 3-3 | 가격·기간 순수 로직 + 테스트 | `model/adPricing.ts`, `.test.ts` | 대기 |
| 3-4 | 대기열 시작 시각 계산 + 테스트 | `model/adSchedule.ts`, `.test.ts` | 대기 |
| 3-5 | 문구 검증 (기존 필터 재사용) + 테스트 | `lib/adText.ts`, `.test.ts` | 대기 |
| 3-6 | LNURL 클라이언트 (LUD-16/06/21) + 테스트 | `server/lnurl.ts`, `.test.ts` | 대기 |
| 3-7 | bolt11 디코드·금액·해시 검증 + 테스트 | `lib/invoiceValidation.ts`, `.test.ts` | 대기 |
| 3-8 | 주문 생성·인보이스 발급 라우트 | `api/space/ads/text/orders/route.ts` | 대기 |
| 3-9 | 결제 확인·구간 확정 (트랜잭션·멱등) + 테스트 | `.../payment/route.ts`, `server/settlement.ts` | 대기 |
| 3-10 | `text`·`timeline` 조회 라우트 + 캐시 | `api/space/ads/text/**` | 대기 |
| 3-11 | HUD 광고 버튼 + 다이얼로그 3단계 | `features/space-ad-order/**`, `SpaceHud.tsx` | 대기 |
| 3-12 | 결제 QR·폴링 훅·5분 카운트다운 | `features/space-ad-order/model/usePaymentPolling.ts` | 대기 |
| 3-13 | 현황 스트립 컴포넌트 (읽기 전용, aria 요약) | `features/space-ad-order/ui/AdTimeline.tsx` | 대기 |
| 3-14 | `TextAdBanner` 슬롯 연결 | `scene/TextAdBanner.tsx`, `SpaceScene.tsx` | 대기 |
| 3-15 | `workers/chat` cron 백스톱 + 테스트 | `workers/chat/**`, `wrangler.jsonc` | 대기 |
| 3-16 | 약관·금지 기준·환불 불가 고지 문구 | 다이얼로그 문구, 정책 페이지 | 대기 |
| 3-17 | 품질 게이트 + 상위 규격서 §6.6·§12 동기화 | `pnpm check`·`tsc`·`test`·`check:cycles` | 대기 |
| 3-18 | 실제 40 sats 결제 → 노출 → 만료 리허설 + 대시보드 중단 확인 | 체크리스트 기록 | 대기 |

작업 18개다. v0.5 의 26개에서 줄었고, 빠진 8개는 이미지·홀드·심사·관리자 경로다. 앞서 구두로 말한 "7개" 추정은 낙관적이었다 — 결제·DB·UI·운영의 기본 골격은 범위를 줄여도 그대로 필요하다.

## 12. 테스트 전략

- **순수 로직은 vitest 로 덮는다**: 가격·할인 계산, 기간 프리셋 검증, 대기열 시작 시각(정시 스냅·점유가 맞붙은 경우·빈 슬롯), 문구 검증(상한·링크·연락처·선정성·제어문자), bolt11 금액·`payment_hash` 일치, preimage SHA-256 검증, 상태 전이 가드.
- **LNURL·Supabase 는 모의한다.** §7.1 에 기록한 **실제 Blink 응답 형태**를 그대로 모의 데이터로 쓴다. 실패 형태(필드 누락, `verify` 없음, 금액 불일치, `status: ERROR`)도 고정한다.
- **멱등성은 회귀 대상이다.** 같은 `payment_hash` 를 폴링과 cron 이 동시에 확정하려 할 때 구간이 하나만 생기는지, `exclude` 제약에 걸린 쪽이 구간을 다시 계산하는지 검증한다.
- **만료 처리**: 요청한 `expiry` 와 발급된 bolt11 만료가 다를 때 저장값이 디코드 결과를 따르는지, 만료 후 10분이 지나면 확인 대상에서 빠지는지 본다.
- 3D 렌더와 실제 결제는 자동 검증하지 않는다. `3-18` 에서 사람이 확인한다. 대시보드에서 `status='stopped'` 로 고친 광고가 90초 안에 내려가는지도 그때 함께 본다.
- 품질 게이트: `pnpm check`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm check:cycles`.

## 13. 보안·운영 메모

- **service role 키는 서버에서만 읽는다.** `NEXT_PUBLIC_` 을 붙이지 않고, import 경로를 `server/` 로 격리해 클라이언트 번들에 들어가지 않게 한다.
- **인증이 필요한 라우트를 만들지 않는다**(§6.1). 관리자 토큰·세션·OAuth 가 없으므로 그 경로로 생기는 취약점도 없다. 대신 Supabase 대시보드 계정이 사실상의 운영 권한이므로 그 계정에 2FA 를 걸어둔다.
- 비용: Supabase Free · Cloudflare Worker cron 무료 한도 안에서 운영을 전제한다. **무료 운영을 보장하지는 않는다** — 계정 전체 사용량에 따라 달라진다.
- 수신 주소를 바꿀 때 재배포만으로 끝나도록 `SPACE_ADS_LN_ADDRESS` 환경변수로 둔다. 코드에 박지 않는다.

## 14. 열린 질문

| # | 질문 | 영향 |
| --- | --- | --- |
| Q1 | 한 사람이 장기 독점하는 것을 제한할지 (예: 연속 30일 상한) | 현재 제한 없음 |
| Q2 | 동시에 대기 가능한 주문 수를 제한할지 | 현재 무제한. 대기열이 길어지면 1시간권 구매자가 한참 뒤에 노출된다 |
| Q3 | 운영자에게 신규 광고 알림을 보낼지 | 현재는 `/space` 에서 눈으로 보거나 Supabase 대시보드를 열어야 안다 |
| Q4 | 2차(이미지) 착수 시점 | 1차 운영 데이터를 보고 판단 |
| Q5 | 중단 빈도가 높아지면 토큰 1개짜리 중단 라우트를 붙일지 | 현재는 Supabase 대시보드만. 빈도를 보고 판단(§6.1) |

## 15. 변경 이력

| 버전 | 날짜 | 내용 |
| --- | --- | --- |
| v0.7 | 2026-11-01 | **관리자 인증·화면·라우트 전부 제거**(§6.1). 운영자가 한 명이고 할 일이 중단 하나뿐이라 인증 체계를 만들지 않고, 중단은 Supabase 대시보드에서 `status='stopped'` 로 직접 고친다. 노출 판정이 조회 시 `now`·`status` 비교라 DB 한 줄 수정으로 끝나며 최대 90초(캐시 30초 + 폴링 60초) 안에 내려간다. `SPACE_ADS_ADMIN_TOKEN` 과 관리자 라우트 2개, `/admin/space-ads` 화면 삭제. 인증 라우트가 0개가 돼 IP 레이트리밋이 유일한 남용 방어선이 됨을 명시. 작업 19개 → 18개 |
| v0.6 | 2026-11-01 | **범위를 텍스트 배너 1슬롯으로 축소하고 전면 재작성.** 사전 수동 심사를 자동 검증 + 사후 중단으로 바꿔 결제를 1단계로 옮기고, 시작 시각 선택·5분 홀드·조회 토큰·결제 시한·늦은 입금 재배치·이미지 업로드 경로를 전부 제거. 상태 9개 → 5개, 테이블 3개 → 1개, 작업 26개 → 19개. Worker 신설 대신 기존 `workers/chat` 에 cron 추가. 이미지 패널·시간 지정·프라임 타임 할증·클릭 링크는 §10 에 2차 범위로 분리 |
| v0.5 | 2026-11-01 | 예약형 전환. 광고주가 시작 시각을 고르고 5분 홀드를 잡는 구조, `payment_holding` 상태와 `exclude` 제약 확장, 3행 타임라인 2모드, 늦은 입금 구간 재배치 (v0.6 에서 2차로 이월) |
| v0.4 | 2026-11-01 | 인보이스 만료를 5분(`expiry=300`)으로 확정. 미만료 인보이스 재사용 규칙으로 이중 결제 차단, 이중 입금 감지 경로 추가 |
| v0.3 | 2026-11-01 | Blink LNURL callback 의 비표준 `expiry` 파라미터가 요청값대로 반영됨을 실측 |
| v0.2 | 2026-11-01 | `onlybtcapp@blink.sv` 로 C1·C2 실측 확인. `verify` 지원·`minSendable` 1 sat·`commentAllowed` 255·인보이스 기본 만료 30일 기록 |
| v0.1 | 2026-11-01 | 최초 작성. 비수탁 Blink 의 API·웹훅 부재를 확인해 LNURL-pay + LUD-21 verify 폴링 구조로 설계. 이미지 서버는 R2 채택. 시간당 단가와 기간 할인 책정 |
