import type { Metadata } from "next";
import { PageLayout } from "@/shared/ui/layout";
import { SettingsPage } from "@/views/settings";

export const metadata: Metadata = {
  title: "Settings",
};

export default function Page() {
  return (
    <PageLayout className="pt-0.5">
      <SettingsPage />
    </PageLayout>
  );
}
