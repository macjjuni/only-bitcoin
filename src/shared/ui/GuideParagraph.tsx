import type { ReactNode } from "react";

export default function GuideParagraph({ children }: { children: ReactNode }) {
  return <p className="text-sm opacity-90 leading-relaxed">{children}</p>;
}
