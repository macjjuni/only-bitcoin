

export const floorToDecimal = (num: number, decimal: number): number => {
  const factor = 10 ** decimal;
  return Math.floor(num * factor) / factor;
};


export function bytesToMB(bytes: number, decimal = 2) {
  const MB = 1024 * 1024; // 1MB = 1024KB = 1024 * 1024 Bytes

  return floorToDecimal(bytes / MB, decimal);
}

export function isNumber(str: string) {
  return /^\d+$/.test(str);
}
