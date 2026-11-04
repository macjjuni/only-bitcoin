import { FloatingBannerButton, GroupIcon } from "@/shared/ui";

/** 채팅 런처 자리를 이어받음. 아이콘도 그대로 써서 같은 기능으로 읽히게 했음. */
export default function SpaceLinkFloatingBanner() {
  return (
    <FloatingBannerButton href="/space" aria-label="스페이스로 이동">
      <GroupIcon size={28} className="pointer-events-none text-neutral-900 dark:text-white" />
    </FloatingBannerButton>
  );
}
