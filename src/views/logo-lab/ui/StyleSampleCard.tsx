import type { ReactNode } from "react";
import {
  HEADER_ICON_SIZE_IN_CSS_PX,
  HEADER_WORDMARK_SAMPLE_SIZE,
  ICON_SAMPLE_SIZES_IN_CSS_PX,
  SAMPLE_LABEL_CLASS,
  SAMPLE_PANEL_CLASS,
  SECTION_HEADING_CLASS,
  SPEC_CLASS,
  WORDMARK_SAMPLE_SIZES,
  type WordmarkSampleSize,
} from "../model/sampleLayout";

interface StyleSampleCardProps {
  name: string;
  spec: string;
  description: string;
  /** 아이콘 시안. 없으면 아이콘 줄을 안 그림. */
  renderIcon?: (sizeInCssPx: number) => ReactNode;
  /** 워드마크 시안. 없으면 워드마크 줄을 안 그림. */
  renderWordmark?: (sampleSize: WordmarkSampleSize) => ReactNode;
  /** 위 두 틀에 안 맞는 시안은 패널 안에 그대로 넣음. */
  children?: ReactNode;
}

/**
 * 프리셋 하나의 시안 카드.
 * 아이콘·워드마크가 둘 다 있으면 맨 위에 실제 헤더 배치( 아이콘 + 워드마크 )를 먼저 보여줌.
 */
export default function StyleSampleCard({
  name,
  spec,
  description,
  renderIcon,
  renderWordmark,
  children,
}: StyleSampleCardProps) {
  // region [Templates]
  const HeaderComboTemplate =
    renderIcon !== undefined && renderWordmark !== undefined ? (
      <div className="flex flex-col gap-2">
        <span className={SAMPLE_LABEL_CLASS}>헤더 조합</span>
        <div className="flex items-center gap-2">
          {renderIcon(HEADER_ICON_SIZE_IN_CSS_PX)}
          {renderWordmark(HEADER_WORDMARK_SAMPLE_SIZE)}
        </div>
      </div>
    ) : null;

  const IconRowTemplate =
    renderIcon !== undefined ? (
      <div className="flex flex-col gap-2">
        <span className={SAMPLE_LABEL_CLASS}>아이콘 {ICON_SAMPLE_SIZES_IN_CSS_PX.join(" · ")}</span>
        <div className="flex flex-wrap items-end gap-6">
          {ICON_SAMPLE_SIZES_IN_CSS_PX.map((iconSizeInCssPx) => (
            <span key={iconSizeInCssPx} className="inline-flex">
              {renderIcon(iconSizeInCssPx)}
            </span>
          ))}
        </div>
      </div>
    ) : null;

  const WordmarkRowsTemplate =
    renderWordmark !== undefined
      ? WORDMARK_SAMPLE_SIZES.map((sampleSize) => (
          <div key={sampleSize.id} className="flex flex-col gap-2">
            <span className={SAMPLE_LABEL_CLASS}>{sampleSize.label}</span>
            {renderWordmark(sampleSize)}
          </div>
        ))
      : null;
  // endregion

  return (
    <section className="flex flex-col gap-2.5">
      <header className="flex flex-col gap-1 px-1">
        <h3 className={SECTION_HEADING_CLASS}>{name}</h3>
        <p className={SPEC_CLASS}>{spec}</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      </header>

      <div className={SAMPLE_PANEL_CLASS}>
        {HeaderComboTemplate}
        {IconRowTemplate}
        {WordmarkRowsTemplate}
        {children}
      </div>
    </section>
  );
}
