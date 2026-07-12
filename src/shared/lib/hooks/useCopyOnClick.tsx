"use client";

import { kToast } from "kku-ui";
import { clipboardUtil } from "kku-util";
import { type RefObject, useCallback } from "react";

export default function useCopyOnClick(refElement: RefObject<HTMLElement | null>) {
  const onClickCopy = useCallback(async () => {
    if (!refElement.current) {
      return;
    }

    const text = refElement.current?.dataset.copy || "";
    const isCopySuccess = await clipboardUtil.copyToClipboard(text);

    if (isCopySuccess) {
      kToast.success(`"${text}" 복사 완료`);
    }
  }, []);

  return onClickCopy;
}
