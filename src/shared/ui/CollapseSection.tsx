import type { ReactNode } from "react";
import type { ComponentBaseTypes } from "@/shared/lib/types";

interface CollapseSectionTypes extends ComponentBaseTypes {
  /** 여닫이 제목 (heading 요소 전달 권장) */
  title: ReactNode;
  /** 초기 펼침 여부 */
  defaultOpen?: boolean;
  /** summary(제목 영역) 추가 클래스 */
  summaryClassName?: string;
  /** 펼쳐지는 콘텐츠 영역 추가 클래스 */
  contentClassName?: string;
  children: ReactNode;
}

/**
 * 네이티브 `<details>`/`<summary>` 기반 여닫이 섹션.
 *
 * JS 제어 아코디언과 달리 접힌 상태에서도 콘텐츠가 항상 DOM에 렌더링되어
 * 검색엔진 크롤링(SEO)과 접근성에 유리하다.
 */
const CollapseSection = (props: CollapseSectionTypes) => {
  // region [Privates]
  const {
    id,
    className = "",
    title,
    defaultOpen = false,
    summaryClassName = "",
    contentClassName = "",
    children,
  } = props;
  // endregion

  // region [Render]
  return (
    <details id={id} open={defaultOpen} className={`group ${className}`.trim()}>
      <summary
        className={`flex cursor-pointer items-center justify-between gap-2 font-bold list-none [&::-webkit-details-marker]:hidden ${summaryClassName}`.trim()}
      >
        {title}
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

      <div className={contentClassName}>{children}</div>
    </details>
  );
  // endregion
};

export default CollapseSection;
