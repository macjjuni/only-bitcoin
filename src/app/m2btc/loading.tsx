const CHART_SKELETON_HEIGHT = 466;

/** M2와 BTC 서버 데이터를 조회하는 동안 표시하는 차트 스켈레톤. */
export default function M2BtcLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="미국 M2와 비트코인 데이터 불러오는 중"
      className="flex w-full animate-pulse flex-col gap-4 rounded-xl border border-border p-4 font-pretendard"
      role="status"
      style={{ height: CHART_SKELETON_HEIGHT }}
    >
      <div className="flex justify-between gap-6">
        <div className="h-12 w-28 rounded-md bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-12 w-28 rounded-md bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div className="min-h-0 flex-1 rounded-md bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-8 rounded-md bg-neutral-200 dark:bg-neutral-800" />
    </div>
  );
}
