interface SurgeCandle {
  openTime: number;
  open: number;
  close: number;
}

/**
 * 급등락 판정 기준.
 *
 * 스페이스 전광판의 30분봉과 같은 잣대를 씀. **이전 봉 종가 대비 현재가** 라서
 * 음악이 바뀌는 순간 전광판에서도 지금 봉이 길게 자란 게 보임. 15분 롤링 창으로
 * 재던 예전 기준은 차트와 맞지 않았고, ±1% 라 10분 머무는 동안 들을 확률이
 * 0.6% 뿐이었음.
 *
 * 숫자는 BTCUSDT 1분봉 14일치(2026-10-24 ~ 11-07)에 아래 상태기계를 그대로 돌려 고름.
 * - ±0.6% 진입은 하루 3.0회(일별 0~10회), 10분 방문 중 전환을 볼 확률 2.1%.
 * - ±0.5% 는 하루 4.9회, ±0.7% 는 하루 1.6회에 14일 중 6일이 0회였음.
 *
 * 새 봉이 시작되면 기준가가 바뀌어 변동률이 0 으로 돌아감. 그것만 보고 끄면
 * 급등 한가운데 정각·30분마다 음악이 끊김(±0.5% 기준 78% 가 이렇게 꺼졌음).
 * 그래서 끌 때는 최근 5분도 잠잠해야 함. 이러면 한 번 켜졌을 때 중앙값 13분 유지됨.
 *
 * **이 값은 조용한 장(7.5만~8.2만 달러) 기준임.** 변동성이 커지면 더 자주 켜짐.
 */
export const SPACE_BGM_SURGE = {
  /** 전광판 봉 길이. 기준가를 고르는 데 씀. */
  candleIntervalMs: 30 * 60 * 1000,
  /** 이전 봉 종가 대비 이 이상 움직이면 교체 트랙으로. 등락 방향은 가리지 않음. */
  enterPercent: 0.6,
  /**
   * 이 이상 움직이면 교체 트랙을 미리 받기 시작함.
   *
   * 트랙이 6.2MB 라 진입 순간에 받기 시작하면 느린 회선에서 몇 초 늦게 바뀜.
   * 0.4% 는 14일 기준 하루 7~8번 넘는 선이라 받아 두고 안 쓰는 경우도 있지만,
   * 한 번 받으면 다시 받지 않음.
   */
  prefetchPercent: 0.4,
  /**
   * 이전 봉 종가 대비 이 밑으로 가라앉아야 복귀를 고려함.
   *
   * 진입과 같은 값을 쓰면 경계에서 값이 떨릴 때 트랙이 몇 초마다 바뀜.
   */
  exitPercent: 0.3,
  /** 복귀 전에 잠잠한지 보는 창. */
  calmWindowMs: 5 * 60 * 1000,
  /** 이 창의 변동이 이 밑이어야 잠잠하다고 봄. */
  calmPercent: 0.15,
  /** 한 번 바뀌면 최소 이만큼 유지. 3초 틀고 끊기는 걸 막음. */
  minHoldMs: 2 * 60 * 1000,
  /** 복귀 후 이 시간 동안은 다시 발동하지 않음. */
  cooldownMs: 10 * 60 * 1000,
  /** 샘플 사이 최소 간격. 소켓은 초당 여러 번 와서 그대로 쌓으면 창이 수천 개가 됨. */
  sampleIntervalMs: 5 * 1000,
  /** 최신 샘플이 이보다 오래되면 판정을 멈춤. 소켓이 끊긴 상태임. */
  stalePriceMs: 2 * 60 * 1000,
} as const;

export interface PriceSample {
  atMs: number;
  price: number;
}

export interface SurgeState {
  /** 오래된 것부터. 잠잠한지 보는 창 밖으로 나간 샘플은 버림. */
  samples: readonly PriceSample[];
  isSurging: boolean;
  startedAtMs: number;
  endedAtMs: number;
}

// region [Privates]
/** 창보다 조금 더 남겨 둠. 딱 맞춰 버리면 가장 오래된 샘플이 창에 못 미침. */
const resolveSampleFloorMs = (nowMs: number): number => {
  return nowMs - SPACE_BGM_SURGE.calmWindowMs - SPACE_BGM_SURGE.sampleIntervalMs * 2;
};

const readFreshLatestSample = (state: SurgeState, nowMs: number): PriceSample | null => {
  const latest = state.samples.at(-1);

  if (!latest || nowMs - latest.atMs > SPACE_BGM_SURGE.stalePriceMs) {
    return null;
  }

  return latest;
};
// endregion

export const createSurgeState = (): SurgeState => ({
  samples: [],
  isSurging: false,
  startedAtMs: 0,
  // 첫 판정이 쿨다운에 걸리지 않게 함.
  endedAtMs: Number.NEGATIVE_INFINITY,
});

/**
 * 시세 한 점을 창에 넣음.
 *
 * 간격이 촘촘하거나 시간이 거꾸로 가는 값은 버림. 소켓은 거래소 두 곳에서 오고
 * 재연결 직후 지난 타임스탬프가 섞여 들어올 수 있음.
 */
export const appendPriceSample = (state: SurgeState, price: number, atMs: number): SurgeState => {
  if (!Number.isFinite(price) || price <= 0) {
    return state;
  }

  const latest = state.samples.at(-1);

  if (latest && atMs - latest.atMs < SPACE_BGM_SURGE.sampleIntervalMs) {
    return state;
  }

  const floorMs = resolveSampleFloorMs(atMs);
  const kept = state.samples.filter((sample) => sample.atMs >= floorMs);

  return { ...state, samples: [...kept, { atMs, price }] };
};

/**
 * 지금 봉의 기준가(이전 봉 종가). 모르면 `null`.
 *
 * 현재 봉 시가가 있으면 그걸 씀. 24시간 시장이라 이전 봉 종가와 같고, 지난 봉
 * 조회가 1분마다라 경계 직후에 받은 이전 봉은 아직 덜 닫힌 값일 수 있음.
 */
export const resolveReferencePrice = (
  candles: readonly SurgeCandle[],
  nowMs: number,
): number | null => {
  const { candleIntervalMs } = SPACE_BGM_SURGE;
  const currentOpenTime = Math.floor(nowMs / candleIntervalMs) * candleIntervalMs;
  const current = candles.find((candle) => candle.openTime === currentOpenTime);

  if (current && current.open > 0) {
    return current.open;
  }

  const previous = candles.find((candle) => candle.openTime === currentOpenTime - candleIntervalMs);

  return previous && previous.close > 0 ? previous.close : null;
};

/**
 * 이전 봉 종가 대비 변동률(%). 판정할 수 없으면 `null`.
 *
 * 기준가를 모르거나 시세가 끊긴 경우를 숫자 0 과 구분함. 0 으로 뭉뚱그리면
 * 소켓이 죽은 동안 "잠잠하다" 로 읽혀 판정이 흐려짐.
 */
export const readCandleChangePercent = (
  state: SurgeState,
  referencePrice: number | null,
  nowMs: number,
): number | null => {
  const latest = readFreshLatestSample(state, nowMs);

  if (!latest || !referencePrice || referencePrice <= 0) {
    return null;
  }

  return ((latest.price - referencePrice) / referencePrice) * 100;
};

/**
 * 최근 5분 변동률(%). 판정할 수 없으면 `null`.
 *
 * 창을 다 못 채웠어도 있는 만큼으로 잼. 켜진 뒤 최소 유지 2분 동안 샘플이 쌓여서
 * 복귀를 따질 때쯤엔 2분 넘게 모여 있음.
 */
export const readCalmChangePercent = (state: SurgeState, nowMs: number): number | null => {
  const latest = readFreshLatestSample(state, nowMs);

  if (!latest) {
    return null;
  }

  const oldest = state.samples.find(
    (sample) => sample.atMs >= latest.atMs - SPACE_BGM_SURGE.calmWindowMs,
  );

  if (!oldest || oldest === latest) {
    return null;
  }

  return ((latest.price - oldest.price) / oldest.price) * 100;
};

/**
 * 상태기계 한 걸음.
 *
 * 진입은 이전 봉 종가 대비 변동만 봄. 복귀는 그 변동이 가라앉고 최근 5분도
 * 잠잠해야 함. 판정할 수 없는 동안(`null`)은 잠잠한 것으로 봄. 진입은 값이 있을
 * 때만 하고, 재생 중에 소켓이 죽으면 최소 유지 시간을 채운 뒤 기본 트랙으로 돌아감.
 */
export const stepSurgeState = (
  state: SurgeState,
  referencePrice: number | null,
  nowMs: number,
): SurgeState => {
  const change = readCandleChangePercent(state, referencePrice, nowMs);
  const magnitude = change === null ? 0 : Math.abs(change);

  if (!state.isSurging) {
    const isCooledDown = nowMs - state.endedAtMs >= SPACE_BGM_SURGE.cooldownMs;

    if (change !== null && magnitude >= SPACE_BGM_SURGE.enterPercent && isCooledDown) {
      return { ...state, isSurging: true, startedAtMs: nowMs };
    }

    return state;
  }

  const hasHeldLongEnough = nowMs - state.startedAtMs >= SPACE_BGM_SURGE.minHoldMs;
  const calmChange = readCalmChangePercent(state, nowMs);
  const isCalm = calmChange === null || Math.abs(calmChange) <= SPACE_BGM_SURGE.calmPercent;

  if (magnitude <= SPACE_BGM_SURGE.exitPercent && isCalm && hasHeldLongEnough) {
    return { ...state, isSurging: false, endedAtMs: nowMs };
  }

  return state;
};
