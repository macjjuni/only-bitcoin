import { createPageMetadata } from "@/shared/config/metadata";
import { IncidentsScreen } from "@/views/incidents";

export const metadata = createPageMetadata({
  path: "/incidents",
  title: "거래소 사고 연표",
  description: "2014년부터 2026년까지 주요 가상자산 거래소 사고를 시간순으로 확인하세요.",
});

export default function IncidentsPage() {
  return <IncidentsScreen />;
}
