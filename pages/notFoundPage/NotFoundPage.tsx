"use client";

import { useRouter } from "next/navigation";
import { KButton } from "kku-ui";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <h2 className="text-md font-bold layout-max:text-xl">404 - Error</h2>
      <h3 className="text-md mb-4 layout-max:text-xl">페이지를 찾을 수 없습니다.</h3>
      <KButton
        variant="outline"
        onClick={() => router.back()}
      >
        뒤로가기
      </KButton>
    </div>
  );
}