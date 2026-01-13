export const isDev = process.env.NODE_ENV === 'development'

let originalTitle = '';

/**
 * 실시간 가격을 문서 타이틀 앞에 추가
 * @param price 실시간 가격 (포맷팅 된 문자열 권장)
 */
export const setTitle = (price: string | number) => {
  if (typeof window === 'undefined') return;

  // 최초 호출 시 기존에 설정된 메타데이터 타이틀 저장
  if (!originalTitle) {
    originalTitle = document.title;
  }

  // 요청하신 형식: "가격 | 원래 타이틀"
  document.title = `${price} | ${originalTitle}`;
};

/**
 * 객체 깊은 비교
 */
export function deepEqual(obj1: object, obj2: object): boolean {
  if (!obj1 || !obj2) return obj1 === obj2
  return JSON.stringify(obj1, Object.keys(obj1).sort()) === JSON.stringify(obj2, Object.keys(obj2).sort())
}

/**
 * 배열 셔플
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function onRouteToExternalLink(url: string) {
  if (!url) return

  const anchorTag = document.createElement('a')

  anchorTag.href = url
  anchorTag.target = '_blank'
  anchorTag.rel = 'noopener noreferrer'

  anchorTag.click()
  anchorTag.remove()
}