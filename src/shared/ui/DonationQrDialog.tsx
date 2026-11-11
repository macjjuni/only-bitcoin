"use client";

import {
  KDialog,
  KDialogClose,
  KDialogContent,
  KDialogDescription,
  KDialogHeader,
  KDialogOverlay,
  KDialogPortal,
  KDialogTitle,
  kToast,
} from "kku-ui";
import { clipboardUtil } from "kku-util";
import { Copy, X } from "lucide-react";
import { useId } from "react";
import { LightningIcon } from "./icon";
import ShareCardQr from "./ShareCardQr";

export interface DonationQrDialogProps {
  lightningAddress: string;
  isOpen: boolean;
  onClose: () => void;
  /** 모달을 닫은 뒤 포커스를 돌려줄 버튼의 ID. */
  returnFocusID: string;
}

/** 설정 화면과 같은 QR 크기와 여백을 사용한다. */
const DONATION_QR_SIZE = 200;
const DONATION_QR_PADDING = 16;
const DONATION_QR_LOGO_SRC = "/app/icon-192x192.png";

// biome-ignore format: AGENTS.md requires two blank lines between regions.
function DonationQrDialog({ lightningAddress, isOpen, onClose, returnFocusID }: DonationQrDialogProps) {
  // region [Hooks]
  const qrCanvasID = useId();
  // endregion


  // region [Events]
  const onOpenChangeDialog = (nextIsOpen: boolean): void => {
    if (!nextIsOpen) {
      onClose();
    }
  };

  /** 외부 버튼으로 여는 모달도 닫힘 애니메이션이 끝난 뒤 포커스를 복원한다. */
  const onCloseAutoFocusDialog = (event: Event): void => {
    event.preventDefault();
    document.getElementById(returnFocusID)?.focus();
  };

  const onClickCopyAddress = async (): Promise<void> => {
    try {
      const isCopySuccess = await clipboardUtil.copyToClipboard(lightningAddress);

      if (isCopySuccess) {
        kToast.success("주소 복사 완료! 👍");
      } else {
        kToast.error("주소를 복사하지 못했어요. 다시 시도해 주세요.");
      }
    } catch {
      kToast.error("주소를 복사하지 못했어요. 다시 시도해 주세요.");
    }
  };
  // endregion

  if (!lightningAddress) {
    return null;
  }

  return (
    <KDialog open={isOpen} onOpenChange={onOpenChangeDialog} size="sm" blur={3} opacity={70}>
      {/* 공유 카드의 transform 안에 배경이 갇히지 않도록 body 에 포털로 띄운다. */}
      <KDialogPortal>
        <KDialogOverlay className="z-[60]" />
      </KDialogPortal>
      <KDialogContent
        onCloseAutoFocus={onCloseAutoFocusDialog}
        className="z-[60] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[320px] gap-4 overflow-y-auto rounded-3xl border-white/10 bg-[#0d1119] p-5 text-white [&>button]:hidden"
      >
        <KDialogHeader className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <KDialogTitle className="flex items-center gap-1.5 text-base font-bold">
              <LightningIcon size={18} />
              개발자 후원
            </KDialogTitle>
            <KDialogClose asChild>
              <button
                type="button"
                aria-label="후원 창 닫기"
                className="flex size-8 flex-shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </KDialogClose>
          </div>
          <KDialogDescription className="text-xs leading-relaxed text-white/60">
            라이트닝 후원은 운영에 큰 힘이 돼요.
          </KDialogDescription>
        </KDialogHeader>

        <div className="flex justify-center">
          <ShareCardQr
            id={qrCanvasID}
            value={lightningAddress}
            size={DONATION_QR_SIZE}
            padding={DONATION_QR_PADDING}
            ecLevel="Q"
            logoImageSrc={DONATION_QR_LOGO_SRC}
            logoPadding={6}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClickCopyAddress}
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-white/[0.08] text-xs font-semibold text-white/85 transition-colors hover:bg-white/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin"
          >
            <Copy size={14} aria-hidden="true" />
            주소 복사
          </button>
        </div>
      </KDialogContent>
    </KDialog>
  );
}

export default DonationQrDialog;
