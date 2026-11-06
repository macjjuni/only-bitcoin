import type { BtcCandle } from "@/entities/bitcoin";

/**
 * 급등락 판정 기준.
 *
 * 24시간 등락률(`krwChange24h`)은 **수준**이지 **움직임**이 아니라 쓸 수 없음.
 * 하루 -6% 면 그 값이 몇 시간이고 그대로라 배경음이 종일 교체 트랙에 갇힘.
 * 짧은 창의 변동률이어야 "지금 막 터졌다" 를 잡음.
 *
 * 숫자는 BTCUSDT 5분봉 3,000개(10.4일)에 아래 상태기계를 그대로 돌려 고름.
 * 진입 1.0%/해제 0.5% 가 10.4일 동안 11번(하루 1.1회), 교체 트랙이 깔려 있는
 * 시간은 전체의 1.5% 였음. 1.2% 로 올리면 하루 0.5회로 줄어 만들어 두고도
 * 며칠씩 못 듣고, 0.6% 로 내리면 하루 2.6회라 금방 질림.
 *
 * **이 값은 조용한 장 10일 기준임.** 변동성이 터지면 같은 기준이 하루 열 번도
 * 발동함. 상수로 두고 실제로 보면서 조정할 것.
 */
export const SPACE_BGM_SURGE = {
  /** 변동률을 재는 창. */
  windowMs: 15 * 60 * 1000,
  /** 이 이상 움직이면 교체 트랙으로. 등락 방향은 가리지 않고 절댓값만 봄. */
  enterPercent: 1,
  /**
   * 이 밑으로 가라앉으면 기본 트랙으로 복귀.
   *
   * 진입과 같은 값을 쓰면 경계에서 값이 떨릴 때 트랙이 몇 초마다 바뀜.
   * 임계치 숫자보다 이 떨림이 체감을 더 망침.
   */
  exitPercent: 0.5,
  /** 한 번 바뀌면 최소 이만큼 유지. 3초 틀고 끊기는 걸 막음. */
  minHoldMs: 2 * 60 * 1000,
  /** 복귀 후 이 시간 동안은 다시 발동하지 않음. */
  cooldownMs: 10 * 60 * 1000,
  /** 샘플 사이 최소 간격. 소켓은 초당 여러 번 와서 그대로 쌓으면 창이 수천 개가 됨. */
  sampleIntervalMs: 5 * 1000,
  /** 창의 이만큼은 채워야 판정함. 들어온 지 3분 된 값으로 15분 변동률이라 할 수 없음. */
  minWindowFillRatio: 0.9,
  /** 최신 샘플이 이보다 오래되면 판정을 멈춤. 소켓이 끊긴 상태임. */
  stalePriceMs: 2 * 60 * 1000,
} as const;

export interface PriceSample {
  atMs: number;
  price: number;
}

export interface SurgeState {
  /** 오래된 것부터. 창 밖으로 나간 샘플은 버림. */
  samples: readonly PriceSample[];
  isSurging: boolean;
  startedAtMs: number;
  endedAtMs: number;
}

// region [Privates]
/** 창보다 조금 더 남겨 둠. 딱 맞춰 버리면 가장 오래된 샘플이 창에 못 미침. */
const resolveSampleFloorMs = (nowMs: number): number => {
  return nowMs - SPACE_BGM_SURGE.windowMs - SPACE_BGM_SURGE.sampleIntervalMs * 2;
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

/** 여러 점을 한꺼번에 넣음. 1분봉으로 창을 미리 채울 때 씀. */
export const seedPriceSamples = (state: SurgeState, samples: PriceSample[]): SurgeState => {
  return samples.reduce(
    (nextState, sample) => appendPriceSample(nextState, sample.price, sample.atMs),
    state,
  );
};

/** 1분봉을 창에 넣을 샘플로. 진행 중인 마지막 봉도 시가를 쓰므로 그대로 받음. */
export const toPriceSamples = (candles: readonly BtcCandle[]): PriceSample[] => {
  return candles.map((candle) => ({ atMs: candle.openTime, price: candle.open }));
};

/**
 * 창의 변동률(%). 판정할 수 없으면 `null`.
 *
 * 창을 아직 못 채웠거나(방금 들어옴) 시세가 끊긴 경우를 숫자 0 과 구분함.
 * 0 으로 뭉뚱그리면 소켓이 죽은 동안 "잠잠하다" 로 읽혀 교체 트랙이 풀림.
 */
export const readSurgeChangePercent = (state: SurgeState, nowMs: number): number | null => {
  const oldest = state.samples.at(0);
  const latest = state.samples.at(-1);

  if (!oldest || !latest || oldest === latest || oldest.price <= 0) {
    return null;
  }

  if (nowMs - latest.atMs > SPACE_BGM_SURGE.stalePriceMs) {
    return null;
  }

  const filledMs = latest.atMs - oldest.atMs;

  if (filledMs < SPACE_BGM_SURGE.windowMs * SPACE_BGM_SURGE.minWindowFillRatio) {
    return null;
  }

  return ((latest.price - oldest.price) / oldest.price) * 100;
};

/**
 * 상태기계 한 걸음.
 *
 * 판정할 수 없는 동안(`null`)은 잠잠한 것으로 봄. 진입은 값이 있을 때만 하므로
 * 창을 채우기 전에는 발동하지 않고, 재생 중에 소켓이 죽으면 최소 유지 시간을
 * 채운 뒤 기본 트랙으로 돌아감.
 */
export const stepSurgeState = (state: SurgeState, nowMs: number): SurgeState => {
  const change = readSurgeChangePercent(state, nowMs);
  const magnitude = change === null ? 0 : Math.abs(change);

  if (!state.isSurging) {
    const isCooledDown = nowMs - state.endedAtMs >= SPACE_BGM_SURGE.cooldownMs;

    if (change !== null && magnitude >= SPACE_BGM_SURGE.enterPercent && isCooledDown) {
      return { ...state, isSurging: true, startedAtMs: nowMs };
    }

    return state;
  }

  const hasHeldLongEnough = nowMs - state.startedAtMs >= SPACE_BGM_SURGE.minHoldMs;

  if (magnitude <= SPACE_BGM_SURGE.exitPercent && hasHeldLongEnough) {
    return { ...state, isSurging: false, endedAtMs: nowMs };
  }

  return state;
};
