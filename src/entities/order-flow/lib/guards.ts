/**
 * 외부 거래소 메시지 검증기.
 *
 * 프로젝트에 Zod 가 없으므로 타입 가드로 좁힌다. 파싱에 실패한 메시지는 예외를 던지지 않고
 * `null` 을 돌려주어, 메시지 하나가 페이지 전체를 멈추지 않게 한다.
 */

/** 객체 형태인지 확인한다. 배열과 null 은 제외한다. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 유한한 숫자로 변환한다. 문자열 수량을 그대로 주는 거래소가 있어 문자열도 받는다.
 * 변환 실패·NaN·Infinity 는 `null` 이다.
 */
export function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsedNumber = Number(value);
    return Number.isFinite(parsedNumber) ? parsedNumber : null;
  }

  return null;
}

/** 음수 수량을 걸러 낸 유한 숫자. 0 은 호가 삭제 신호라 허용한다. */
export function parseNonNegativeNumber(value: unknown): number | null {
  const parsedNumber = parseFiniteNumber(value);

  if (parsedNumber === null || parsedNumber < 0) {
    return null;
  }

  return parsedNumber;
}

/** 0 보다 큰 유한 숫자. 가격처럼 0 이 의미 없는 값에 쓴다. */
export function parsePositiveNumber(value: unknown): number | null {
  const parsedNumber = parseFiniteNumber(value);

  if (parsedNumber === null || parsedNumber <= 0) {
    return null;
  }

  return parsedNumber;
}

/** 식별자로 쓸 수 있는 문자열/숫자를 문자열로 정규화한다. */
export function parseIdentifier(value: unknown): string | null {
  if (typeof value === "string" && value !== "") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

/** `[가격, 수량]` 쌍 배열을 호가 레벨로 변환한다. 잘못된 항목은 건너뛴다. */
export function parseLevelPairs(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) {
    return [];
  }

  const levels: Array<[number, number]> = [];

  for (const pair of value) {
    if (!Array.isArray(pair) || pair.length < 2) {
      continue;
    }

    const priceInQuote = parsePositiveNumber(pair[0]);
    const sizeInBtc = parseNonNegativeNumber(pair[1]);

    if (priceInQuote === null || sizeInBtc === null) {
      continue;
    }

    levels.push([priceInQuote, sizeInBtc]);
  }

  return levels;
}

/** 소켓이 문자열·바이너리 어느 쪽으로 오든 문자열로 만든다. Upbit 는 바이너리로 준다. */
export function decodeSocketPayload(payload: unknown): string | null {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload instanceof ArrayBuffer) {
    return new TextDecoder().decode(payload);
  }

  if (ArrayBuffer.isView(payload)) {
    return new TextDecoder().decode(payload);
  }

  return null;
}

/** JSON 파싱 실패를 예외 대신 `null` 로 돌려준다. */
export function parseJsonSafely(rawText: string): unknown {
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}
