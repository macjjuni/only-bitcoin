import type { ReactNode } from "react";

interface GuideWarningBoxProps {
  title: string;
  children: ReactNode;
}

export default function GuideWarningBox({ title, children }: GuideWarningBoxProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-bitcoin/10 px-3 py-2.5">
      <strong className="text-sm font-bold text-bitcoin">{title}</strong>
      {children}
    </div>
  );
}
