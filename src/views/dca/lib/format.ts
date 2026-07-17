/**
 * BTC 개수를 소수 8자리 이하로 불필요한 0 없이 표시한다. (예: 0.015, 1.5, 2)
 */
export function formatBtc(btcCount: number): string {
  return parseFloat(btcCount.toFixed(8)).toString();
}

/**
 * 오늘 날짜를 로컬 기준 "YYYY-MM-DD" 형식으로 반환한다.
 */
export function getTodayString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${date}`;
}
