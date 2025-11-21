const title = import.meta.env.VITE_TITLE;
export const isDev = import.meta.env.MODE === "development";

// 문서 타이틀 수정
export const setTitle = (price: string | number) => {
  document.title = `${price} | ${title}`;
};

export function deepEqual(obj1: object, obj2: object): boolean {
  return JSON.stringify(obj1, Object.keys(obj1).sort()) === JSON.stringify(obj2, Object.keys(obj2).sort());
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
