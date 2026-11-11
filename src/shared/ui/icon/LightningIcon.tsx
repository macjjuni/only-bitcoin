import type { IconTypes } from "./icon";

type LightningIconProps = Pick<IconTypes, "size" | "className" | "style">;

/** 노랑·주황 음영을 유지하는 라이트닝 후원 아이콘. */
export default function LightningIcon({ size = 24, className, style }: LightningIconProps) {
  // region [Templates]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m7 0-5 12h8l-4 10 14-14h-9l6-8z" fill="#f1c40f" />
      <path d="m7 0-5 12h3l5-12zm3 12-4 10 3-3 4-7z" fill="#f39c12" />
      <path d="m10 12-0.4062 1h2.9062l0.5-1h-3z" fill="#e67e22" />
    </svg>
  );
  // endregion
}
