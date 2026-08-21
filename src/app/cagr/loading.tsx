/**
 * ISR 로 구워진 뒤에는 거의 안 보임. 최초 요청과 캐시가 비었을 때만 뜸.
 *
 * kku-ui 컴포넌트를 쓰지 않음. `loading.tsx` 는 서버 컴포넌트인데 kku-ui 는
 * 모듈 최상단에서 `createContext` 를 부르므로 RSC 로 평가되면 프리렌더가 깨짐.
 * 스켈레톤은 CSS 만으로 충분해서 클라이언트 경계를 만들 이유도 없음.
 */
const SKELETON_ROW_COUNT = 8;

export default function CagrLoading() {
  return (
    <div
      className="flex w-full flex-col gap-2 p-4"
      role="status"
      aria-busy="true"
      aria-label="월별 등락률 불러오는 중"
    >
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => index).map((rowIndex) => (
        <div
          key={rowIndex}
          className="h-6 w-full animate-pulse rounded-[3px] bg-neutral-200 dark:bg-neutral-800"
        />
      ))}
    </div>
  );
}
