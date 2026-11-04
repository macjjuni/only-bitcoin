"use client";

import { kToast } from "kku-ui";
import { clipboardUtil } from "kku-util";
import { Copy, X, Zap } from "lucide-react";
import {
  type KeyboardEvent,
  type MouseEvent,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { ShareCardQr } from "@/shared/ui";

interface SpaceDonationDialogProps {
  /** 라이트닝 주소(LNURL). 설정 화면의 개발자 후원과 같은 값. */
  lightningAddress: string;
  onClose: () => void;
}

/** 설정 화면 후원 QR 과 같은 값. 105자 LNURL 이 ecLevel Q 에서 스캔 권장선을 넘는 크기임. */
const DONATION_QR_SIZE = 200;
const DONATION_QR_PADDING = 16;
const DONATION_QR_LOGO_EMOJI = "⚡";
const DONATION_QR_LOGO_PADDING = 6;
const DONATION_TITLE_ID = "space-donation-title";

/**
 * 스페이스 개발자 후원 모달.
 *
 * 캔버스 위 전체를 덮어 뒤 조작을 막음. Esc·배경 클릭·닫기 버튼으로 닫힘.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceDonationDialog({ lightningAddress, onClose }: SpaceDonationDialogProps): ReactNode {
  // region [Hooks]
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // endregion


  // region [Privates]
  const focusCloseButton = useCallback((): void => {
    closeButtonRef.current?.focus();
  }, []);
  // endregion


  // region [Events]
  const onClickBackdrop = useCallback((event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const onKeyDownDialog = useCallback((event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  }, [onClose]);

  const onClickCopyAddress = useCallback(async (): Promise<void> => {
    const isCopySuccess = await clipboardUtil.copyToClipboard(lightningAddress);
    if (isCopySuccess) {
      kToast.success("주소 복사 완료! 👍");
    }
  }, [lightningAddress]);
  // endregion


  // region [Life Cycles]
  useEffect(focusCloseButton, [focusCloseButton]);
  // endregion

  return (
    // 배경 클릭 닫기는 보조 수단임. 키보드는 대화상자의 Esc·닫기 버튼이 맡음.
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClickBackdrop}>
      <div role="dialog" aria-modal="true" aria-labelledby={DONATION_TITLE_ID} onKeyDown={onKeyDownDialog} className="w-full max-w-[300px] rounded-2xl border border-white/10 bg-[#0d1119]/95 p-4 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id={DONATION_TITLE_ID} className="flex items-center gap-1.5 text-sm font-semibold">
            <Zap size={16} className="text-bitcoin" />
            개발자 후원
          </h2>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="후원 창 닫기" className="flex size-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin">
            <X size={18} />
          </button>
        </div>

        <p className="mt-1 text-xs leading-relaxed text-white/55">
          라이트닝으로 후원해 주시면 온리 비트코인 운영에 큰 힘이 돼요.
        </p>

        <div className="mt-4 flex justify-center">
          <ShareCardQr id="space-donation-qr" value={lightningAddress} size={DONATION_QR_SIZE} padding={DONATION_QR_PADDING} ecLevel="Q" logoEmoji={DONATION_QR_LOGO_EMOJI} logoPadding={DONATION_QR_LOGO_PADDING} />
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClickCopyAddress} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-white/[0.08] text-xs font-semibold text-white/85 hover:bg-white/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin">
            <Copy size={14} />
            주소 복사
          </button>
          <a href={`lightning:${lightningAddress}`} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-bitcoin text-xs font-bold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            <Zap size={14} />
            지갑 열기
          </a>
        </div>
      </div>
    </div>
  );
}

const MemoizedSpaceDonationDialog = memo(SpaceDonationDialog);
MemoizedSpaceDonationDialog.displayName = "SpaceDonationDialog";

export default MemoizedSpaceDonationDialog;
