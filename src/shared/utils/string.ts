
const commaRegex = /\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g;

export const valueCheck = (val?: string | number | null | object) => {
  return !(val === null || val === undefined || val === "");
};

/* ---------- string 형식에 숫자만 포함됐는지 체크 ---------- */
function isStrNumber(val: string): boolean {
  return !Number.isNaN(Number(val));
}

/* ---------- 천 단위 콤마 변환 ---------- */
export function comma(num: string | number, removeDecimal = true): string {

  if (typeof num === 'string') {
    // 문자형이지만 숫자말고 문자가 포함된 경우 체크
    const numCheck = isStrNumber(num);

    if (numCheck) {
      return num.replace(commaRegex, ",");
    }

    throw Error(`숫자 이외에 문자열이 포함됨, ${num}`, );
  }

  const rexReplace = (numStr: string) => {
    return numStr.replace(commaRegex, ",");
  }

  // 소수점 제거
  if (removeDecimal) {
    return rexReplace(Math.floor(num).toString()) || '0';
  }

  return rexReplace(num.toString()) || '0';
}

export const removeSpaces = (str: string): string => {
  return str.replace(/\s+/g, '');
};

export function extractNumbers(input: string): number {
  const strNumber = input.replace(/[^0-9]/g, '');
  return Number(strNumber);
}