import { createPageMetadata } from "@/shared/config/metadata";
import { PageLayout } from "@/shared/ui/layout";
import { PrivacyPolicy } from "@/views/privacy";

export const metadata = createPageMetadata({
  path: "/privacy",
  title: "Privacy Policy",
  description:
    "온리 비트코인의 개인정보처리방침입니다. 브라우저 저장 정보, 공개 채팅 데이터, 쿠키, 광고·분석 도구 및 외부 서비스의 정보 처리를 안내합니다.",
});

export default function Page() {
  return (
    <PageLayout className="pt-0.5">
      <PrivacyPolicy />
    </PageLayout>
  );
}
