import type { Metadata } from "next";
import { PageLayout } from "@/shared/ui/layout";
import { LogoLabContent } from "@/views/logo-lab";

/**
 * 내부 시안 비교용 페이지라 색인에서 뺀다.
 *
 * `robots.txt` 의 Disallow 가 아니라 `noindex` 여야 한다. Disallow 는 크롤러가 내용을
 * 읽지 못하게만 막아서, 외부 링크가 하나라도 있으면 내용 없이 URL 만 색인된다.
 * ( `app/settings/page.tsx` 와 같은 이유 )
 */
export const metadata: Metadata = {
  title: "Logo Lab",
  description: "사이퍼펑크 워드마크 시안을 실제 사용 크기로 비교하는 내부 페이지입니다.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <PageLayout className="pt-0.5">
      <LogoLabContent />
    </PageLayout>
  );
}
