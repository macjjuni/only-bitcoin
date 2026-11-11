/**
 * BIP39 단어 번호를 시드 도트 12칸으로 바꿈.
 *
 * 번호가 1부터라( 1~2048 ) 2048 은 12비트가 필요함. 그래서 11칸이 아니라 12칸임.
 * @param index 1~2048. 목록의 `BIP39Item.index` 그대로 넘김.
 * @returns 12자리. 켜진 칸은 `*`, 꺼진 칸은 `O`.
 */
export function toBip39Binary(index: number) {
  if (index < 0 || index > 2048) {
    throw new Error("index must be a number between 0 and 2048");
  }
  const originStr = index.toString(2).padStart(12, "0");
  const replacedPoint = originStr.replaceAll("1", "*");
  return replacedPoint.replaceAll("0", "O");
}
