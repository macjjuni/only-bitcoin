"use client";

import { KButton } from "kku-ui";
import { useTransitionRouter } from "next-view-transitions";

/**
 * 404 화면의 클라이언트 파트.
 *
 * `app/not-found.tsx` 는 `metadata` 를 내보내야 해서 서버 컴포넌트로 둬야 함.
 * 뒤로가기 버튼만 여기로 갈라 놓음.
 */
export default function NotFoundContent() {
  // region [Hooks]
  const router = useTransitionRouter();
  // endregion

  // region [Events]
  const onClickGoBack = () => router.back();
  // endregion

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <h1 className="text-base font-bold layout-max:text-xl">404 - Error</h1>
      <h2 className="text-base mb-4 layout-max:text-xl">페이지를 찾을 수 없습니다.</h2>
      <KButton variant="outline" onClick={onClickGoBack}>
        뒤로가기
      </KButton>
    </div>
  );
}
