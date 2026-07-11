"use client";

import { KCard } from "kku-ui";
import { memo } from "react";
import { blocksGuideSections } from "@/views/blocks/model/constants";

const BlocksGuideArticle = () => {
  return (
    <KCard className="glass-surface w-full">
      <article className="flex flex-col gap-2 p-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-[18px] font-bold">비트코인 블록 이해하기</h2>
          <p className="text-sm opacity-80 leading-relaxed">
            블록, 채굴, 반감기, 수수료까지 비트코인 네트워크의 핵심 개념을 처음 접하는 분도 쉽게
            이해할 수 있도록 정리했습니다.
          </p>
        </header>

        <div className="flex flex-col">
          {blocksGuideSections.map(({ value, title, paragraphs }, idx) => (
            <details
              key={value}
              open={idx === 0}
              className="group border-b border-border last:border-none"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-2 py-4 text-base font-bold list-none [&::-webkit-details-marker]:hidden">
                <h3 className="m-0 text-base font-bold">{title}</h3>
                <svg
                  className="size-4 shrink-0 opacity-70 transition-transform duration-200 group-open:rotate-180"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>

              <div className="flex flex-col gap-3 pb-5">
                {paragraphs.map((text) => (
                  <p key={text.slice(0, 16)} className="text-sm opacity-90 leading-relaxed">
                    {text}
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </article>
    </KCard>
  );
};

const MemoizedBlocksGuideArticle = memo(BlocksGuideArticle);
MemoizedBlocksGuideArticle.displayName = "BlocksGuideArticle";

export default MemoizedBlocksGuideArticle;
