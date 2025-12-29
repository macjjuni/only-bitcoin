import { memo } from "react";
import { KAspectRatio, KDialog, KDialogContent, KDialogHeader, KDialogTitle } from "kku-ui";
import LazyImage from "@/components/ui/LazyImage";

interface ModalTypes {
  open: boolean;
  setOpen: (val: boolean) => void;
}

function FearAndGreedDialog({ open, setOpen }: ModalTypes) {

  return (
    <KDialog open={open} onOpenChange={setOpen} blur={2} size="sm">
      <KDialogContent>
        <KDialogHeader>
          <KDialogTitle>
            <strong>공포 & 탐욕 지수</strong>
          </KDialogTitle>
        </KDialogHeader>
        <KAspectRatio ratio={1.1146}>
          <LazyImage src={`https://alternative.me/crypto/fear-and-greed-index.png?${Date.now()}`}
                     alt="공포 & 탐욕 지수" className="h-full" />
        </KAspectRatio>
      </KDialogContent>
    </KDialog>
  );
};


const MemoizedFearAndGreedDialog = memo(FearAndGreedDialog);
MemoizedFearAndGreedDialog.displayName = "FearAndGreedDialog";

export default MemoizedFearAndGreedDialog;