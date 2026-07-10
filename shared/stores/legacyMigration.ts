/**
 * ⚠️ 제거 예정 (Deprecated)
 *
 * 단일 전역 스토어(`only-bitcoin`)에 함께 저장돼 있던 도메인 상태를
 * 각 소유 레이어의 전용 스토어 키로 1회 이관하기 위한 임시 모듈이다.
 * 기존 사용자 대부분이 최신 버전으로 넘어온 뒤 이 파일과 호출부를 삭제한다.
 *
 * 스키마 버전
 * - v0: 모든 슬라이스가 `only-bitcoin` 한 키에 저장됨
 * - v1: btc2Fiat 상태를 `only-bitcoin-btc2fiat` 로 분리
 * - v2: bitcoin / block 도메인 상태를 각각 전용 키로 분리
 *
 * 설계 노트:
 * - 옛 키에 `null`이나 `"migrated"` 같은 센티널 값을 남기지 않는다.
 *   zustand persist의 기본 merge는 `{ ...currentState, ...persistedState }`
 *   얕은 병합이라, 저장된 값이 슬라이스 기본값을 덮어쓴다. 센티널을 남기면
 *   롤백 시 구버전 번들이 `btc2Fiat.btcCount` 같은 값을 읽다 TypeError로 죽는다.
 *   키를 지우면 구버전 번들은 기본값으로 안전하게 되돌아간다.
 * - 이관 완료 여부는 persist 봉투의 `version` 필드로 판별한다. 도메인 타입을
 *   오염시키지 않으면서 zustand가 제공하는 표준 수단이다.
 * - 각 스토어 모듈 최상단에서 호출한다. 멱등하므로 중복 호출은 무해하고,
 *   어느 스토어가 먼저 하이드레이트하더라도 데이터를 잃지 않는다.
 * - `theme` 은 `only-bitcoin` 최상위에 남는다. `app/layout.tsx` 의 블로킹
 *   스크립트가 첫 페인트 전에 `parsed.state.theme` 를 읽기 때문이다.
 */

export const STORE_PERSIST_KEY = "only-bitcoin";
export const BTC2FIAT_PERSIST_KEY = "only-bitcoin-btc2fiat";
export const BITCOIN_PERSIST_KEY = "only-bitcoin-bitcoin";
export const BLOCK_PERSIST_KEY = "only-bitcoin-block";

/** 현재 `only-bitcoin` 키의 스키마 버전 */
const CURRENT_VERSION = 2;

/** 전역 스토어에서 분리되어 나간 상태 키 목록 */
const MIGRATION_TARGETS: ReadonlyArray<{ key: string; stateKeys: readonly string[] }> = [
  {
    key: BTC2FIAT_PERSIST_KEY,
    stateKeys: ["btc2Fiat", "focusCurrency", "premium"],
  },
  {
    key: BITCOIN_PERSIST_KEY,
    stateKeys: [
      "bitcoinPrice",
      "krwMarket",
      "usdMarket",
      "macroSequence",
      "overviewChart",
      "marketChartInterval",
      "miningMetricChartInterval",
      "exRate",
    ],
  },
  {
    key: BLOCK_PERSIST_KEY,
    stateKeys: ["blockData", "fees"],
  },
];

interface PersistEnvelope {
  state?: Record<string, unknown>;
  version?: number;
}

/**
 * 구버전 localStorage를 현재 스키마로 이관한다.
 * 이미 이관됐거나(version >= CURRENT_VERSION), 저장된 값이 없거나, 서버 사이드면
 * 아무것도 하지 않는다.
 */
export const migrateLegacyStore = () => {
  if (typeof window === "undefined") {
    return;
  }

  const raw = localStorage.getItem(STORE_PERSIST_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw) as PersistEnvelope;

    if ((parsed.version ?? 0) >= CURRENT_VERSION) {
      return;
    }

    const remaining: Record<string, unknown> = { ...(parsed.state ?? {}) };

    for (const { key, stateKeys } of MIGRATION_TARGETS) {
      const carved: Record<string, unknown> = {};

      for (const stateKey of stateKeys) {
        if (stateKey in remaining) {
          carved[stateKey] = remaining[stateKey];
          delete remaining[stateKey];
        }
      }

      // 이미 전용 스토어가 값을 갖고 있다면 덮어쓰지 않는다.
      const hasMigratedValue = localStorage.getItem(key) !== null;
      if (!hasMigratedValue && Object.keys(carved).length > 0) {
        localStorage.setItem(key, JSON.stringify({ state: carved, version: 0 }));
      }
    }

    localStorage.setItem(
      STORE_PERSIST_KEY,
      JSON.stringify({ state: remaining, version: CURRENT_VERSION }),
    );
  } catch (error) {
    console.error("Legacy store migration failed", error);
  }
};
