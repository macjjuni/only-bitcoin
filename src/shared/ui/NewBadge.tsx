interface NewBadgeProps {
  /** 위치 지정용. 부모 기준 `absolute` 좌표를 넘김. */
  className?: string;
}

export default function NewBadge({ className }: NewBadgeProps) {
  const badgeClassName = [
    "rounded-full bg-red-500 px-1.5 py-0.5 font-pretendard text-[10px] font-bold leading-4 text-white shadow-sm",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span className={badgeClassName}>NEW</span>;
}
