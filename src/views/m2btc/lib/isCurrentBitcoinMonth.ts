/** BTC 월 키가 서버 렌더링 시점의 현재 월을 나타내는지 확인한다. */
export function isCurrentBitcoinMonth(monthKey: string, currentMonthKey: string): boolean {
  return monthKey === currentMonthKey;
}
