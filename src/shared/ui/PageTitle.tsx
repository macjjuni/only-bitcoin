interface PageTitleProps {
  label: string;
  title: string;
  description?: string;
  as?: "h1" | "h2";
  /**
   * 화면에는 안 보이고 스크린 리더·크롤러에만 노출.
   *
   * 시세 화면처럼 제목 UI 가 필요 없는 페이지에서 씀. `display:none` 은 크롤러가
   * 무시하지만 `sr-only`( clip 방식 )는 읽으므로 제목 신호가 살아 있음.
   * 숨김 텍스트를 늘리지 않으려고 `label` 과 `description` 은 렌더하지 않음.
   */
  srOnly?: boolean;
}

const PageTitle = ({ label, title, description, as: Tag = "h1", srOnly }: PageTitleProps) => {
  if (srOnly) {
    return <Tag className="sr-only">{title}</Tag>;
  }

  return (
    <div className="flex flex-col px-5 py-1 font-pretendard">
      <span className="mb-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-bitcoin">
        {label}
      </span>
      <Tag className="mb-2.5 text-[19px] font-bold leading-tight tracking-tight">{title}</Tag>
      {description && (
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

export default PageTitle;
