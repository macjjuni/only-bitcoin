import type { ReactNode } from "react";
import Card from "./Card";

interface GuideArticleProps {
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}

export default function GuideArticle({ title, subtitle, className, children }: GuideArticleProps) {
  return (
    <Card className={className}>
      <article className="flex flex-col gap-2 p-4">
        <header className="flex flex-col gap-2">
          <h2 className="text-[18px] font-bold">{title}</h2>
          {subtitle && <p className="text-sm opacity-80 leading-relaxed">{subtitle}</p>}
        </header>
        <div className="flex flex-col">{children}</div>
      </article>
    </Card>
  );
}
