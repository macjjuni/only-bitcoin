const title = process.env.NEXT_PUBLIC_TITLE || 'Only Bitcoin'
export const isDev = process.env.NODE_ENV === 'development'

/**
 * 문서 타이틀 수정
 * 클라이언트 사이드 전용 (Window 객체 체크)
 */
export const setTitle = (price: string | number) => {
  if (typeof window !== 'undefined') {
    document.title = `${price} | ${title}`
  }
}

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