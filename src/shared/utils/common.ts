export const isDev = process.env.NODE_ENV === "development";

/** 직전에 붙인 가격 접두사. 다음 호출 때 이것만 떼고 새 가격을 붙임. */
let lastPricePrefix = "";

/**
 * 실시간 가격을 문서 타이틀 앞에 붙임. 형식은 "가격 | 페이지 제목".
 *
 * 페이지 제목을 처음 한 번만 저장해 두면 안 됨. 페이지를 옮기면 Next 가 제목을
 * 새로 쓰는데, 저장해 둔 첫 페이지 제목으로 다시 덮어서 제목이 틀어졌음.
 * 그래서 매번 지금 제목에서 우리가 붙인 접두사만 떼어 냄.
 *
 * @param price 실시간 가격 (포맷팅 된 문자열 권장)
 */
export const setTitle = (price: string | number) => {
  if (typeof window === "undefined") return;

  const currentTitle = document.title;
  const pageTitle =
    lastPricePrefix && currentTitle.startsWith(lastPricePrefix)
      ? currentTitle.slice(lastPricePrefix.length)
      : currentTitle;

  lastPricePrefix = `${price} | `;
  document.title = `${lastPricePrefix}${pageTitle}`;
};

/**
 * 객체 깊은 비교
 */
export function deepEqual(obj1: object, obj2: object): boolean {
  if (!obj1 || !obj2) return obj1 === obj2;
  return (
    JSON.stringify(obj1, Object.keys(obj1).sort()) ===
    JSON.stringify(obj2, Object.keys(obj2).sort())
  );
}

/**
 * 배열 셔플
 */
export function shuffleArray<T>(array: readonly T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
