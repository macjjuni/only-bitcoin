import { formatDateTimeKST } from "@/shared/lib/date";

export interface UpdatedAtBarProps {
  /** 데이터 기준 시각( ISO 문자열 ). 해석 못 하는 값이면 바를 안 그림. */
  updatedAt: string;
  /** 데이터가 오래됐을 때. 점이 주황으로 바뀌고 문구에 지연이 붙음. */
  isDelayed?: boolean;
  className?: string;
}

/**
 * 데이터 업데이트 시각을 보여 주는 한 줄 바.
 * 자산 랭킹·히트맵·M2·ETF 화면이 같은 모양을 써서 공용으로 뺌.
 */
export default function UpdatedAtBar({
  updatedAt,
  isDelayed = false,
  className,
}: UpdatedAtBarProps) {
  // region [Privates]
  const hasValidUpdatedAt = !Number.isNaN(new Date(updatedAt).getTime());
  const statusLabel = isDelayed ? "업데이트 지연" : "업데이트";
  const statusDotClassName = isDelayed ? "bg-bitcoin" : "bg-up";
  // endregion

  if (!hasValidUpdatedAt) {
    return null;
  }

  return (
    <p
      className={`glass-bg flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background/55 px-3.5 py-2.5 font-pretendard text-[11px] font-bold text-muted-foreground ${className ?? ""}`}
    >
      <span className="flex items-center gap-1.5">
        <span className={`size-1.5 shrink-0 rounded-full ${statusDotClassName}`} />
        {statusLabel}
      </span>
      <time dateTime={updatedAt} className="font-number text-xs font-black text-foreground">
        {formatDateTimeKST(updatedAt)}
      </time>
    </p>
  );
}
