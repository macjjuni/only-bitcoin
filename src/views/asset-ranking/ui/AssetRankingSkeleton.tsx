const SKELETON_ROWS = ["asset-1", "asset-2", "asset-3", "asset-4", "asset-5", "asset-6"];

export default function AssetRankingSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="자산 랭킹 불러오는 중"
      className="flex animate-pulse flex-col gap-2.5"
    >
      <div className="h-36 rounded-xl bg-foreground/10" />
      <div className="h-10 rounded-xl bg-foreground/10" />
      <div className="space-y-3 card-surface p-4">
        <div className="h-6 w-32 rounded bg-foreground/10" />
        <div className="h-10 rounded-lg bg-foreground/10" />
        {SKELETON_ROWS.map((rowID) => (
          <div key={rowID} className="h-20 rounded bg-foreground/10" />
        ))}
      </div>
    </div>
  );
}
