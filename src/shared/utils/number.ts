

export const floorToDecimal = (num: number, decimal: number): number => {
  const factor = 10 ** decimal;
  return Math.floor(num * factor) / factor;
};
