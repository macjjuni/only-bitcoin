import { createPageMetadata } from "@/shared/config/metadata";
import { WarScreen } from "@/views/war";

export const metadata = createPageMetadata({
  path: "/war",
  title: "비트코인 매수 vs 매도 전장",
  description:
    "바이낸스·코인베이스·업비트의 실시간 BTC 호가와 체결을 2D 전투 애니메이션으로 보여 줍니다.",
});

export default function WarPage() {
  return <WarScreen />;
}
