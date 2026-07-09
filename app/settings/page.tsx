import type { Metadata } from "next";
import { env } from "@/shared/config/env";
import { PageLayout } from "@/shared/ui/layout";
import { SettingsPage } from "@/views/settings";

export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - Settings`,
};

export default function Page() {
  return (
    <PageLayout className="pt-0.5">
      <SettingsPage />
    </PageLayout>
  );
}
