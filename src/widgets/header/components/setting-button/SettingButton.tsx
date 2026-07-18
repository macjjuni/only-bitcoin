"use client";

import { Undo2Icon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTransitionRouter } from "next-view-transitions";
import { SettingIcon, TransitionLink } from "@/shared/ui";

export default function SettingButton() {
  const pathname = usePathname();
  const router = useTransitionRouter();

  // 뒤로가기 버튼 스타일 (현재 경로가 /settings일 때)
  if (pathname === "/settings") {
    return (
      <button
        type="button"
        onClick={() => router.back()}
        className="text-current cursor-pointer tap-highlight-transparent select-none press-feedback"
      >
        <Undo2Icon size={30} className="text-gray-800 dark:text-gray-200" />
      </button>
    );
  }

  // 설정 버튼 스타일
  return (
    <TransitionLink
      href="/settings"
      className="inline-flex justify-center items-center press-feedback"
    >
      <SettingIcon size={30} className="text-gray-800 dark:text-gray-200" />
    </TransitionLink>
  );
}
