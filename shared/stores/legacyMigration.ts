/**
 * ⚠️ 제거 예정 (Deprecated)
 *
 * v0 단일 스토어(`only-bitcoin`)에 함께 저장돼 있던 btc2Fiat 상태를
 * `views/btc2fiat` 전용 스토어 키로 1회 이관하기 위한 임시 모듈이다.
 * 기존 사용자 대부분이 v1로 넘어온 뒤 이 파일과 호출부를 삭제한다.
 *
 * 설계 노트:
 * - 옛 키에 `null`이나 `"migrated"` 같은 센티널 값을 남기지 않는다.
 *   zustand persist의 기본 merge는 `{ ...currentState, ...persistedState }`
 *   얕은 병합이라, 저장된 값이 슬라이스 기본값을 덮어쓴다. 센티널을 남기면
 *   롤백 시 구버전 번들이 `btc2Fiat.btcCount`를 읽다 TypeError로 죽는다.
 *   키를 지우면 구버전 번들은 기본값으로 안전하게 되돌아간다.
 * - 이관 완료 여부는 persist 봉투의 `version` 필드로 판별한다. 도메인 타입을
 *   오염시키지 않으면서 zustand가 제공하는 표준 수단이다.
 * - `store.ts`와 `btc2FiatStore.ts` 양쪽 모듈 최상단에서 호출한다. 멱등하므로
 *   중복 호출은 무해하고, 어느 쪽이 먼저 하이드레이트하더라도 데이터를 잃지 않는다.
 */

export const STORE_PERSIST_KEY = "only-bitcoin";
export const BTC2FIAT_PERSIST_KEY = "only-bitcoin-btc2fiat";

/** v0 단일 스토어에서 btc2Fiat 전용 스토어로 분리된 상태 키 */
const BTC2FIAT_KEYS = ["btc2Fiat", "focusCurrency", "premium"] as const;

interface PersistEnvelope {
  state?: Record<string, unknown>;
  version?: number;
}

/**
 * 구버전 localStorage를 신버전 스키마로 이관한다.
 * 이미 이관됐거나(version >= 1), 저장된 값이 없거나, 서버 사이드면 아무것도 하지 않는다.
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

    if ((parsed.version ?? 0) >= 1) {
      return;
    }

    const legacyState = parsed.state ?? {};
    const btc2FiatState: Record<string, unknown> = {};
    const restState: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(legacyState)) {
      const isBtc2FiatKey = (BTC2FIAT_KEYS as readonly string[]).includes(key);
      if (isBtc2FiatKey) {
        btc2FiatState[key] = value;
      } else {
        restState[key] = value;
      }
    }

    // 이미 전용 스토어가 값을 갖고 있다면 덮어쓰지 않는다.
    const hasMigratedValue = localStorage.getItem(BTC2FIAT_PERSIST_KEY) !== null;
    if (!hasMigratedValue && Object.keys(btc2FiatState).length > 0) {
      localStorage.setItem(
        BTC2FIAT_PERSIST_KEY,
        JSON.stringify({ state: btc2FiatState, version: 0 }),
      );
    }

    localStorage.setItem(STORE_PERSIST_KEY, JSON.stringify({ state: restState, version: 1 }));
  } catch (error) {
    console.error("Legacy store migration failed", error);
  }
};
