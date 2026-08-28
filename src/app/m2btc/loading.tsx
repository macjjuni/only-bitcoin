const SKELETON_BLOCK = "rounded-md bg-neutral-200 dark:bg-neutral-800";

/** M2와 BTC 서버 데이터를 조회하는 동안 표시하는 차트 스켈레톤. */
export default function M2BtcLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="미국 M2와 비트코인 데이터 불러오는 중"
      className="flex w-full animate-pulse flex-col gap-3 rounded-xl border-[0.75px] border-neutral-300 p-4 font-pretendard dark:border-neutral-600"
      role="status"
    >
      {/* 타이틀 + 기간 라벨 */}
      <div>
        <div className={`h-5 w-44 ${SKELETON_BLOCK}`} />
        <div className={`mt-1.5 h-3 w-28 ${SKELETON_BLOCK}`} />
      </div>

      {/* BTC · US M2 요약 행 */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className={`h-3 w-20 ${SKELETON_BLOCK}`} />
          <div className={`h-5 w-28 ${SKELETON_BLOCK}`} />
          <div className={`h-2.5 w-24 ${SKELETON_BLOCK}`} />
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`h-3 w-12 ${SKELETON_BLOCK}`} />
          <div className={`h-5 w-24 ${SKELETON_BLOCK}`} />
          <div className={`h-2.5 w-28 ${SKELETON_BLOCK}`} />
        </div>
      </div>

      {/* 차트 영역 */}
      <div className={`aspect-[1.8] ${SKELETON_BLOCK}`} />

      {/* 도메인 + 범례 */}
      <div className="flex items-center justify-between">
        <div className={`h-3 w-24 ${SKELETON_BLOCK}`} />
        <div className="flex items-center gap-3">
          <div className={`h-3 w-10 ${SKELETON_BLOCK}`} />
          <div className={`h-3 w-12 ${SKELETON_BLOCK}`} />
        </div>
      </div>
    </div>
  );
}
