'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Undo2Icon } from "lucide-react";
import { SettingIcon } from "@/components/ui/icon";

export default function SettingButton() {
  const pathname = usePathname();
  const router = useRouter();

  // 뒤로가기 버튼 스타일 (현재 경로가 /settings일 때)
  if (pathname === '/settings') {
    return (
      <button
        type="button"
        onClick={() => router.back()}
        className="text-current cursor-pointer"
      >
        <Undo2Icon size={32} />
      </button>
    );
  }

  // 설정 버튼 스타일
  return (
    <Link href="/settings" className="inline-flex justify-center items-center">
      <SettingIcon size={32} className="text-gray-400" />
    </Link>
  );
}