/**
 * 등락률을 색 농도 단계로 옮기는 규칙.
 *
 * 연속 그라데이션 대신 **5단계로 끊음.** 셀마다 숫자가 적혀 있어 정확한 값은
 * 읽으면 되고, 색은 "얼마나 큰 달이었나" 를 훑는 용도라 단계가 뚜렷한 편이 나음.
 *
 * ±40% 에서 최대 농도에 닿음. 비트코인 월 등락률은 +40% 를 넘는 달이 드물지 않아
 * 그 위를 더 세분해 봐야 위쪽만 시커멓게 뭉치고 나머지가 흐려짐.
 */

/** 이 값에서 농도가 최대에 닿음. 넘어가는 달은 모두 같은 색으로 뭉침. */
export const HEAT_DOMAIN_PERCENT = 40;

/** 한쪽 방향 농도 단계 수 */
export const HEAT_STEPS = 5;

/**
 * 등락률 → -5..5 단계. 0 과 결측은 0 임.
 *
 * 0 이 아닌 값은 아무리 작아도 최소 1단계를 받음. 0.3% 짜리 달이 무색으로 빠지면
 * "데이터가 없는 달" 과 구분이 안 됨.
 */
export function resolveHeatLevel(returnRate: number | null): number {
  if (returnRate === null || !Number.isFinite(returnRate) || returnRate === 0) {
    return 0;
  }

  const direction = returnRate < 0 ? -1 : 1;
  const intensityRatio = Math.min(Math.abs(returnRate) / HEAT_DOMAIN_PERCENT, 1);

  return direction * Math.max(1, Math.ceil(intensityRatio * HEAT_STEPS));
}

/**
 * 단계별 배경 클래스.
 *
 * Tailwind 의 `bg-up/40` 같은 알파 변형이 아니라 `globals.css` 에 직접 정의한
 * **불투명색** 유틸임. 이 페이지는 카드로 감싸지 않아 알파를 쓰면 `body.show-bg` 의
 * 매트릭스 배경이 셀을 통해 비쳐 낮은 단계의 숫자가 안 읽힘.
 *
 * **템플릿 문자열로 조립하면 안 됨.** 지금은 직접 정의한 클래스라 Tailwind 수집
 * 대상이 아니지만, 알파 변형으로 되돌릴 일이 생기면 조립한 이름은 못 잡아내
 * 개발 서버에서만 보이다가 프로덕션 빌드에서 색이 통째로 사라짐.
 */
const HEAT_CLASS_NAME_BY_LEVEL: Record<number, string> = {
  [-5]: "heat-down-5",
  [-4]: "heat-down-4",
  [-3]: "heat-down-3",
  [-2]: "heat-down-2",
  [-1]: "heat-down-1",
  0: "",
  1: "heat-up-1",
  2: "heat-up-2",
  3: "heat-up-3",
  4: "heat-up-4",
  5: "heat-up-5",
};

/** 결측 달. 0% 와 구분돼야 하므로 무색이 아니라 빗금으로 표시함. */
const EMPTY_CLASS_NAME = "heat-empty";

export function resolveHeatClassName(returnRate: number | null): string {
  if (returnRate === null) {
    return EMPTY_CLASS_NAME;
  }

  return HEAT_CLASS_NAME_BY_LEVEL[resolveHeatLevel(returnRate)] ?? "";
}

/**
 * 셀에 찍을 문자열.
 *
 * 10% 미만은 소수 한 자리까지 보여 줌. 한 자릿수 구간은 정수로 끊으면 서로 다른
 * 달이 죄다 `3%` 로 보여 비교가 안 됨. 두 자리부터는 소수점이 폭만 잡아먹음.
 */
export function formatReturnRate(returnRate: number): string {
  const fractionDigits = Math.abs(returnRate) < 10 ? 1 : 0;
  const sign = returnRate > 0 ? "+" : "";

  return `${sign}${returnRate.toFixed(fractionDigits)}%`;
}
