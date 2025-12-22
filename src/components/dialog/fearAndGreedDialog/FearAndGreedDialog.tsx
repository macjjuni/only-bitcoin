import { KDialog, KDialogHeader, KDialogContent, KDialogFooter, KDialogClose, KButton } from "kku-ui";
import LazyImage from "@/components/ui/lazyImage/LazyImage";
import "./FearAndGreedModal.scss";

interface ModalTypes {
  open: boolean;
  setOpen: (val: boolean) => void
}

export default function FearAndGreedDialog({open, setOpen}: ModalTypes) {

  return (
      <KDialog open={open} onOpenChange={setOpen} blur={2} size="sm">
        <KDialogContent>

          <KDialogHeader>
            <strong>공포 & 탐욕 지수</strong>
          </KDialogHeader>

          <LazyImage src={`https://alternative.me/crypto/fear-and-greed-index.png?${Date.now()}`}
                     alt="공포 & 탐욕 지수" className="fear-and-greed-index__image"/>

          <KDialogFooter>
            <KDialogClose>
              <KButton size="sm" width="full">닫기</KButton>
            </KDialogClose>
          </KDialogFooter>

        </KDialogContent>
      </KDialog>
  );
};
