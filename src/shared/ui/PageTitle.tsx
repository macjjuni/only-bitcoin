interface PageTitleProps {
  label: string;
  title: string;
  description?: string;
  as?: "h1" | "h2";
}

const PageTitle = ({ label, title, description, as: Tag = "h1" }: PageTitleProps) => {
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
