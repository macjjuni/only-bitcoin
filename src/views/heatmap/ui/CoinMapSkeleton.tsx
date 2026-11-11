const SKELETON_BLOCK = "rounded-md bg-neutral-200 dark:bg-neutral-800";
const LIST_SKELETON_ROWS = ["coin-1", "coin-2", "coin-3", "coin-4", "coin-5"] as const;

/** 히트맵 데이터를 받는 동안 보이는 스켈레톤. */
export default function CoinMapSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="코인 시가총액 데이터 불러오는 중"
      className="flex w-full animate-pulse flex-col gap-2.5"
    >
      <section className="flex flex-col gap-3 card-surface p-4">
        <div className={`h-5 w-32 ${SKELETON_BLOCK}`} />
        <div className={`aspect-square w-full ${SKELETON_BLOCK}`} />
      </section>
      <div className={`h-10 rounded-xl ${SKELETON_BLOCK}`} />
      <section className="flex flex-col gap-3 card-surface p-4">
        <div className={`h-5 w-24 ${SKELETON_BLOCK}`} />
        {LIST_SKELETON_ROWS.map((rowId) => (
          <div key={rowId} className={`h-10 w-full ${SKELETON_BLOCK}`} />
        ))}
      </section>
    </div>
  );
}
