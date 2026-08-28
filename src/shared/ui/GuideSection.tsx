import type { ReactNode } from "react";
import CollapseSection from "./CollapseSection";

interface GuideSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function GuideSection({ title, defaultOpen = false, children }: GuideSectionProps) {
  return (
    <CollapseSection
      title={<h3 className="m-0 text-base font-bold">{title}</h3>}
      defaultOpen={defaultOpen}
      className="border-b-[0.75px] border-neutral-300 last-of-type:border-none dark:border-neutral-600"
      summaryClassName="py-4 text-base"
      contentClassName="flex flex-col gap-3 pb-5"
    >
      {children}
    </CollapseSection>
  );
}
