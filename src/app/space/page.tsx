import { createPageMetadata } from "@/shared/config/metadata";
import { SpaceView } from "@/views/space";

export const metadata = createPageMetadata({
  path: "/space",
  title: "BTC Space",
  description:
    "비트코인 실시간 가격 전광판이 있는 3D 공간을 돌아다니며 다른 사람들과 어울려 보세요.",
});

export default function SpacePage() {
  return (
    <div className="fixed inset-0 h-dvh w-dvw">
      <SpaceView />
    </div>
  );
}
