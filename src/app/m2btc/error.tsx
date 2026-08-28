"use client";

import { KButton } from "kku-ui";
import { useEffect } from "react";

interface M2BtcErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** M2 또는 BTC 서버 조회가 실패했을 때 페이지 안에서 재시도를 제공한다. */
export default function M2BtcError({ error, reset }: M2BtcErrorProps) {
  // region [Events]
  const onClickRetryButton = (): void => {
    reset();
  };
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    console.error("M2BTC 데이터 조회 실패:", error);
  }, [error]);
  // endregion

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <p className="text-sm text-muted-foreground">
        미국 M2 또는 비트코인 데이터를 불러오지 못했어요.
        <br />
        잠시 후 다시 시도해 주세요.
      </p>

      <KButton onClick={onClickRetryButton}>다시 시도</KButton>
    </div>
  );
}
