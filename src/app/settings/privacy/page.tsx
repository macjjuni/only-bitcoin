import type { Metadata } from "next";
import { env } from "@/shared/config/env";
import { PageLayout } from "@/shared/ui/layout";
import { PrivacyPolicy } from "@/views/privacy";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - Privacy Policy`,
  description:
    "온리 비트코인의 개인정보처리방침입니다. 회원가입 없이 이용되며 개인정보를 서버에 저장하지 않습니다. 쿠키, 구글 애드센스 광고, 데이터 출처 및 투자 면책 조항을 안내합니다.",
  alternates: {
    canonical: "/settings/privacy",
  },
};

export default function Page() {
  return (
    <PageLayout className="pt-0.5">
      <PrivacyPolicy />
    </PageLayout>
  );
}
