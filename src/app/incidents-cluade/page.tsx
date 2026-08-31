import type { Metadata } from "next";
import { PageLayout } from "@/shared/ui/layout";
import IncidentsTimelineMock from "./IncidentsTimelineMock";

export const metadata: Metadata = {
  title: "거래소 사고 연표",
  robots: { index: false, follow: false },
};

export default function IncidentsMockPage() {
  return (
    <PageLayout className="incidents-mock font-pretendard">
      <IncidentsTimelineMock />
    </PageLayout>
  );
}
