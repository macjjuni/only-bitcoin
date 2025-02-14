import { stringUtil } from "kku-util";

const { getUuid } = stringUtil;
const commaRegex = /\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g;

function generateUUID() {
  return getUuid();
}

export const valueCheck = (val?: string | number | null | object) => {
  return !(val === null || val === undefined || val === "");
};

/* ---------- string 형식에 숫자만 포함됐는지 체크 ---------- */
function isStrNumber(val: string): boolean {
  return !Number.isNaN(Number(val));
}

/* ---------- 천 단위 콤마 변환 ---------- */
function comma(num: string | number): string {

  if (typeof num === 'string') {
    // 문자형이지만 숫자말고 문자가 포함된 경우 체크
    const numCheck = isStrNumber(num);

    if (numCheck) {
      return num.replace(commaRegex, ",");
    }

    throw Error(`숫자 이외에 문자열이 포함됨, ${num}`, );
  }

  return num?.toString()?.replace(commaRegex, ",") || '0';
}

export { generateUUID, comma };
