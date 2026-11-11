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
  KDialogTrigger,
  kToast,
} from "kku-ui";
import { clipboardUtil } from "kku-util";
import { Copy, X, Zap } from "lucide-react";
import { useId } from "react";
import ShareCardQr from "./ShareCardQr";

export interface DonationQrDialogProps {
  lightningAddress: string;
  isDisabled?: boolean;
}

/** 설정 화면과 같은 QR 크기와 여백을 사용한다. */
const DONATION_QR_SIZE = 200;
const DONATION_QR_PADDING = 16;

// biome-ignore format: AGENTS.md requires two blank lines between regions.
function DonationQrDialog({ lightningAddress, isDisabled = false }: DonationQrDialogProps) {
  // region [Hooks]
  const qrCanvasID = useId();
  // endregion


  // region [Events]
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
    <KDialog size="sm" blur={3} opacity={70}>
      <KDialogTrigger asChild>
        <button
          type="button"
          disabled={isDisabled}
          className="flex h-9 flex-shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-bitcoin/40 bg-neutral-800/80 px-3 text-xs font-bold text-bitcoin backdrop-blur-sm transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin disabled:pointer-events-none disabled:opacity-60"
        >
          <Zap size={14} aria-hidden="true" />
          후원하기
        </button>
      </KDialogTrigger>

      {/* 공유 카드의 transform 안에 배경이 갇히지 않도록 body 에 포털로 띄운다. */}
      <KDialogPortal>
        <KDialogOverlay className="z-[60]" />
      </KDialogPortal>
      <KDialogContent className="z-[60] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[320px] gap-4 overflow-y-auto rounded-3xl border-white/10 bg-[#0d1119] p-5 text-white [&>button]:hidden">
        <KDialogHeader className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <KDialogTitle className="flex items-center gap-1.5 text-base font-bold">
              <Zap size={18} className="text-bitcoin" aria-hidden="true" />
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
            라이트닝으로 후원해 주시면 온리 비트코인 운영에 큰 힘이 돼요.
          </KDialogDescription>
        </KDialogHeader>

        <div className="flex justify-center">
          <ShareCardQr
            id={qrCanvasID}
            value={lightningAddress}
            size={DONATION_QR_SIZE}
            padding={DONATION_QR_PADDING}
            ecLevel="Q"
            logoEmoji="⚡"
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
