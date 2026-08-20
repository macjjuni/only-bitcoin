# 랜드마크 단지 추가

선택 UI · API 화이트리스트 · 아카이브 대상이 모두 [`model/landmarks.ts`](./model/landmarks.ts)
한 배열에서 파생된다. 아래 4단계 외에 손댈 파일 없음.
( 배경·실측 근거: [`docs/btc2apartment.md`](../../../docs/btc2apartment.md) 10장·14장 )

### 1. 표기 검증 — 건너뛰면 조회 0건

매칭이 `aptNm` **정확일치 + 지번**이라 한 글자만 달라도 단지가 통째로 빠진다.

```bash
curl -s "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade\
?serviceKey=$DATA_GO_KR_SERVICE_KEY&LAWD_CD=11650&DEAL_YMD=202505&pageNo=1&numOfRows=3000" \
  | grep -o "<aptNm>[^<]*</aptNm>" | sort -u
```

`aptNm` · `jibun` · `excluUseAr` 를 확인한다.
표기가 쪼개져 있으면 **지번이 같을 때만** `aptNames` 에 모아 통합한다
( 같음: 마포래미안푸르지오 1~4단지 / 다름: 타워팰리스 1·2·3차 → 별개 단지 ).

### 2. `model/landmarks.ts` 항목 추가

기존 항목 복사해서 채운다. 규칙이 있는 건 두 개뿐.

- `defaultAreaInSquareMeter` — **84 버킷 비중 ≥ 10% 일 때만 84**, 아니면 거래 최다 버킷.
  ( `selectDefaultAreaBucket` 로 산출. 84 비중 3.8% 인 타워팰리스1 을 84 로 잡으면 막대가 안 그려진다 )
- `earliestDealYear` — 이전 구간은 조회하지 않는다.

### 3. 사진

`public/images/apartments/<apartmentID>.webp` · 16:9 · 폭 1120px.
파일명이 ID 와 다르면 [`lib/apartmentImage.ts`](./lib/apartmentImage.ts) 의 `IMAGE_FILENAME_MAP` 에 등록.

> ⚠️ 사진은 GitHub raw `main` 에서 읽는다. 머지 전엔 404 이므로 확인하는 동안만
> `IMAGE_SOURCE_BRANCH` 를 작업 브랜치로 바꿨다가 되돌린다.

### 4. 아카이브 재생성

```bash
pnpm build:apartment-archive     # .env.local 의 DATA_GO_KR_SERVICE_KEY 필요
```

`--if-stale` 이 누락 랜드마크를 감지하므로 `pnpm dev` 만 켜도 자동으로 돈다.
생성물 `model/archive.json` 은 커밋한다.

- 안 돌려도 안 깨진다 — 빈 구간은 런타임이 메꾸고 호출량만 는다 ( 콜드 8회 → 152회 ).
- BTC 시세 커버리지가 부족하면 **저장하지 않고 종료**한다. 그냥 다시 돌리면 된다.

### 5. 확인

`pnpm test && pnpm check` → 캐러셀에 뜨는지, 기본 평형 막대가 연도별로 그려지는지.
막대가 비면 2단계 기본 평형 판정을 다시 본다.
