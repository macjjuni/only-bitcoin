const SKELETON_ROWS = ["asset-1", "asset-2", "asset-3", "asset-4", "asset-5", "asset-6"];

export default function AssetRankingLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="자산 랭킹 불러오는 중"
      className="flex animate-pulse flex-col gap-3 p-3"
    >
      <div className="h-6 w-48 rounded bg-foreground/10" />
      <div className="h-36 rounded-xl bg-foreground/10" />
      <div className="h-10 rounded-lg bg-foreground/10" />
      {SKELETON_ROWS.map((rowID) => (
        <div key={rowID} className="h-14 rounded bg-foreground/10" />
      ))}
    </div>
  );
}
