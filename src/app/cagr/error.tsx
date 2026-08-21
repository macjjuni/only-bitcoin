"use client";

import { KButton } from "kku-ui";
import { useEffect } from "react";

interface CagrErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 시세 조회가 끝내 실패했을 때만 보임.
 *
 * 재생성 중 실패는 Next 가 직전에 성공한 정적 HTML 을 계속 서빙하므로 여기까지 안 옴.
 * 루트 `error.tsx` 는 화면 전체를 덮어 헤더·하단 네비까지 사라지는데, 이 페이지는
 * 카드 하나가 못 그려진 것뿐이라 레이아웃을 남겨 두는 편이 나음.
 */
export default function CagrError({ error, reset }: CagrErrorProps) {
  // region [Life Cycles]
  useEffect(() => {
    console.error("월별 등락률 조회 실패:", error);
  }, [error]);
  // endregion

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <p className="text-sm text-muted-foreground">
        시세 데이터를 불러오지 못했어요.
        <br />
        잠시 후 다시 시도해 주세요.
      </p>

      <KButton onClick={reset}>다시 시도</KButton>
    </div>
  );
}
