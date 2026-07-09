/**
 * BIP39 단어 인덱스를 받아 11비트 2진 문자열로 반환
 * @param index 0~2047 (BIP39 word index)
 * @returns 11자리의 '0'/'1' 로 구성된 문자열
 */
export function toBip39Binary(index: number) {
  if (index < 0 || index > 2048) {
    throw new Error("index must be a number between 0 and 2047");
  }
  const originStr = index.toString(2).padStart(12, "0");
  const replacedPoint = originStr.replaceAll('1', '*');
  return replacedPoint.replaceAll('0', 'O');
}
