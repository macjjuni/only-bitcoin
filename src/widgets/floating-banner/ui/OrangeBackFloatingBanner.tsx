import { ArrowLeft } from "lucide-react";
import { FloatingBannerButton } from "@/shared/ui";

export default function OrangeBackFloatingBanner() {
  return (
    <FloatingBannerButton href="/orange" aria-label="오렌지 서비스로 이동">
      <ArrowLeft size={28} className="text-black dark:text-white" />
    </FloatingBannerButton>
  );
}
