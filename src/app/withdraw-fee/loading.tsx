const SKELETON_BLOCK = "rounded-md bg-neutral-200 dark:bg-neutral-800";
const EXCHANGE_SKELETON_ROWS = [
  { id: "upbit", widthClassName: "w-24" },
  { id: "bithumb", widthClassName: "w-28" },
  { id: "korbit", widthClassName: "w-20" },
  { id: "binance", widthClassName: "w-32" },
  { id: "kraken", widthClassName: "w-24" },
] as const;

/** 거래소별 출금 조건을 조회하는 동안 표시하는 표 스켈레톤. */
export default function WithdrawFeeLoading() {
  return (
    <div
      className="flex w-full animate-pulse flex-col gap-3 rounded-xl border-[0.75px] border-neutral-300 p-4 font-pretendard dark:border-neutral-600"
      role="status"
      aria-busy="true"
      aria-label="거래소 출금 수수료 불러오는 중"
    >
      <div className="flex items-center justify-between gap-3">
        <div className={`h-5 w-36 ${SKELETON_BLOCK}`} />
        <div className={`h-5 w-16 rounded-full ${SKELETON_BLOCK}`} />
      </div>

      <div className={`h-9 w-full ${SKELETON_BLOCK}`} />

      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        {EXCHANGE_SKELETON_ROWS.map((exchangeSkeletonRow) => (
          <div
            key={exchangeSkeletonRow.id}
            className="flex h-10 items-center justify-between border-b border-border last:border-none"
          >
            <div className={`h-4 ${exchangeSkeletonRow.widthClassName} ${SKELETON_BLOCK}`} />
            <div className={`h-4 w-20 ${SKELETON_BLOCK}`} />
          </div>
        ))}
      </div>

      <div className={`h-3 w-3/4 self-center ${SKELETON_BLOCK}`} />
      <div className={`h-10 w-full ${SKELETON_BLOCK}`} />
      <div className={`h-3 w-32 self-end ${SKELETON_BLOCK}`} />
    </div>
  );
}
