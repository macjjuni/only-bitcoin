"use client";

import { KAspectRatio, KDialog, KDialogContent, KDialogHeader, KDialogOverlay, KDialogTitle } from "kku-ui";
import LazyImage from "@/components/ui/LazyImage";
import { useMemo } from "react";

interface ModalTypes {
  open: boolean;
  setOpen: (val: boolean) => void;
}

export default function FearAndGreedDialog({ open, setOpen }: ModalTypes) {

  // region [Hooks]
  // eslint-disable-next-line react-hooks/purity
  const imageUrl = useMemo(() => (`https://alternative.me/crypto/fear-and-greed-index.png?${Date.now()}`), [open]);
  // endregion

  return (
    <KDialog open={open} onOpenChange={setOpen} blur={2} size="sm">
      <KDialogOverlay />
      <KDialogContent>
        <KDialogHeader>
          <KDialogTitle>
            <strong>공포 & 탐욕 지수</strong>
          </KDialogTitle>
        </KDialogHeader>
        <KAspectRatio ratio={1.1146}>
          <LazyImage src={imageUrl} alt="공포 & 탐욕 지수" className="h-full" />
        </KAspectRatio>
      </KDialogContent>
    </KDialog>
  );
}