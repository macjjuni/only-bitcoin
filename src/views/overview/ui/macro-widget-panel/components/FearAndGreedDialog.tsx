"use client";

import {
  KAspectRatio,
  KDialog,
  KDialogContent,
  KDialogDescription,
  KDialogHeader,
  KDialogOverlay,
  KDialogTitle,
} from "kku-ui";
import { memo, useMemo } from "react";
import { LazyImage } from "@/shared/ui";

interface ModalTypes {
  open: boolean;
  setOpen: (val: boolean) => void;
}

function FearAndGreedDialog({ open, setOpen }: ModalTypes) {
  // region [Hooks]
  // eslint-disable-next-line react-hooks/purity
  const imageUrl = useMemo(
    () => `https://alternative.me/crypto/fear-and-greed-index.png?${Date.now()}`,
    [open],
  );
  // endregion

  return (
    <KDialog open={open} onOpenChange={setOpen} blur={2} size="sm">
      <KDialogOverlay />
      <KDialogContent className="!top-[44%]">
        <KDialogHeader>
          <KDialogTitle>
            <strong>공포 & 탐욕 지수</strong>
          </KDialogTitle>
          <KDialogDescription className="sr-only">
            시장의 투자 심리를 0(극단적 공포)부터 100(극단적 탐욕)까지 나타낸 지표 이미지입니다.
          </KDialogDescription>
        </KDialogHeader>
        <KAspectRatio ratio={1.1146}>
          <LazyImage src={imageUrl} alt="공포 & 탐욕 지수" className="h-full" />
        </KAspectRatio>
      </KDialogContent>
    </KDialog>
  );
}

const MemoizedFearAndGreedDialog = memo(FearAndGreedDialog);
MemoizedFearAndGreedDialog.displayName = "MemoizedFearAndGreedDialog";

export default MemoizedFearAndGreedDialog;
