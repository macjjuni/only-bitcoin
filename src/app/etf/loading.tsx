/** 요약 · 주요 지표 · 업데이트 바 · 차트 · ETF별 순유입 순서의 대략 높이. */
const ETF_LOADING_CARD_HEIGHTS = [290, 340, 40, 400, 420] as const;

/** ETF 외부 데이터를 조회하는 동안 페이지 골격 안에 표시하는 스켈레톤. */
export default function EtfLoading() {
  return (
    <div
      className="flex w-full flex-col gap-2.5"
      role="status"
      aria-busy="true"
      aria-label="비트코인 현물 ETF 데이터 불러오는 중"
    >
      {ETF_LOADING_CARD_HEIGHTS.map((cardHeight) => (
        <div
          key={cardHeight}
          className="w-full animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900"
          style={{ height: cardHeight }}
        />
      ))}
    </div>
  );
}
