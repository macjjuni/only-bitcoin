export const floorToDecimal = (num: number, decimal: number): number => {
  const factor = 10 ** decimal;
  return Math.floor(num * factor) / factor;
};

export function bytesToMB(bytes: number, decimal = 2) {
  const MB = 1024 * 1024; // 1MB = 1024KB = 1024 * 1024 Bytes

  return floorToDecimal(bytes / MB, decimal);
}

export function isNumber(str: string) {
  return /^-?\d+(\.\d*)?$/.test(str); // 소숫점 뒤에 숫자가 없어도 허용
}

export function btcToSatoshi(btcCount: string | number): string {
  return BigInt(Math.floor(parseFloat(btcCount.toString()) * 100_000_000)).toLocaleString();
}


export function formatHashrate(hashrate: number) {
  // eslint-disable-next-line no-restricted-globals
  if (hashrate === 0 || !isFinite(hashrate)) {
    return "0.00 H/s";
  }

  let hashrateValue = hashrate;

  // SI 접두어 기호 (1000의 거듭제곱)
  const units = ['H/s', 'kH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s', 'ZH/s', 'YH/s'];
  const base = 1000;
  let i = 0;

  // 단위 변환: hashrate가 base보다 작아질 때까지 반복
  while (hashrateValue >= base && i < units.length - 1) {
    hashrateValue /= base;
    i++;
  }

  // 소수점 둘째 자리까지 표시
  return `${hashrateValue.toFixed(2)} ${units[i]}`;
}
