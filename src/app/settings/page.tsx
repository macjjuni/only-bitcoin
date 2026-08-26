import type { Metadata } from "next";
import { PageLayout } from "@/shared/ui/layout";
import { SettingsPage } from "@/views/settings";

/**
 * 색인에서 빼려면 robots.txt 의 Disallow 가 아니라 이 noindex 여야 한다.
 * Disallow 는 크롤러가 페이지를 "읽지" 못하게 막을 뿐이라, 외부 링크가 하나라도
 * 있으면 내용 없이 URL 만 색인된다. ( 게다가 막아 두면 noindex 자체를 못 읽는다 )
 */
export const metadata: Metadata = {
  title: "Settings",
  description: "온리 비트코인의 표시 통화, 시작 페이지 등 개인 설정을 변경합니다.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <PageLayout className="pt-0.5">
      <SettingsPage />
    </PageLayout>
  );
}
