const SKELETON_BLOCK = "rounded-md bg-neutral-200 dark:bg-neutral-800";
const COMPANY_SKELETON_ROWS = ["company-1", "company-2", "company-3", "company-4"] as const;

/** 상장기업 트레저리 데이터를 조회하는 동안 표시하는 스켈레톤. */
export default function TreasuryLoading() {
  return (
    <div
      className="flex w-full animate-pulse flex-col gap-2.5"
      role="status"
      aria-busy="true"
      aria-label="상장기업 비트코인 트레저리 데이터 불러오는 중"
    >
      <section className="-mx-2 -mt-2.5 flex flex-col gap-3 px-5 pb-5 pt-4">
        <div className={`h-3 w-44 ${SKELETON_BLOCK}`} />
        <div className={`h-6 w-64 ${SKELETON_BLOCK}`} />
        <div className={`h-12 w-72 max-w-full ${SKELETON_BLOCK}`} />
        <div className={`h-4 w-48 ${SKELETON_BLOCK}`} />
        <div className={`h-28 w-full rounded-xl ${SKELETON_BLOCK}`} />
        <div className="grid grid-cols-2 gap-2.5">
          <div className={`h-16 rounded-xl ${SKELETON_BLOCK}`} />
          <div className={`h-16 rounded-xl ${SKELETON_BLOCK}`} />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border-[0.75px] border-neutral-300 p-4 dark:border-neutral-600">
        <div className="flex items-center justify-between">
          <div className={`h-5 w-32 ${SKELETON_BLOCK}`} />
          <div className={`h-3 w-10 ${SKELETON_BLOCK}`} />
        </div>
        <div className={`h-8 w-full ${SKELETON_BLOCK}`} />
        <div className={`h-10 w-full ${SKELETON_BLOCK}`} />
        <div className="flex flex-col">
          {COMPANY_SKELETON_ROWS.map((companySkeletonRow) => (
            <div
              key={companySkeletonRow}
              className="flex h-14 items-center justify-between border-b border-border last:border-none"
            >
              <div className="flex flex-col gap-1.5">
                <div className={`h-4 w-28 ${SKELETON_BLOCK}`} />
                <div className={`h-3 w-16 ${SKELETON_BLOCK}`} />
              </div>
              <div className={`h-4 w-24 ${SKELETON_BLOCK}`} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
