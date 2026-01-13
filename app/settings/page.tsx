import { PageLayout } from "@/layouts";
import { Metadata } from "next";
import { env } from "@/shared/config/env";
import SettingsPage from "@/components/features/settings/SettingsPage";


export const metadata: Metadata = {
  title: `${env.NEXT_PUBLIC_TITLE} - Settings`
};


export default function Page() {

  return (
    <PageLayout className="pt-0.5">
      <SettingsPage />
    </PageLayout>
  );
}