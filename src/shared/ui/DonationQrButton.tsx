"use client";

import { useId, useState } from "react";
import DonationQrDialog from "./DonationQrDialog";
import { LightningIcon } from "./icon";

export interface DonationQrButtonProps {
  lightningAddress: string;
  isDisabled?: boolean;
}

/** 공유 카드가 닫혀 버튼이 사라지면 후원 모달의 열림 상태도 함께 정리된다. */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function DonationQrButton({ lightningAddress, isDisabled = false }: DonationQrButtonProps) {
  // region [Hooks]
  const triggerID = useId();
  const [isOpen, setIsOpen] = useState(false);
  // endregion


  // region [Events]
  const onClickOpenDonation = (): void => {
    setIsOpen(true);
  };

  const onCloseDonation = (): void => {
    setIsOpen(false);
  };
  // endregion

  if (!lightningAddress) {
    return null;
  }

  return (
    <>
      <button
        id={triggerID}
        type="button"
        disabled={isDisabled}
        onClick={onClickOpenDonation}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="flex h-9 flex-shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-bitcoin/40 bg-neutral-800/80 px-3 text-xs font-bold text-bitcoin backdrop-blur-sm transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin disabled:pointer-events-none disabled:opacity-60"
      >
        <LightningIcon size={14} />
        후원하기
      </button>
      <DonationQrDialog
        lightningAddress={lightningAddress}
        isOpen={isOpen}
        onClose={onCloseDonation}
        returnFocusID={triggerID}
      />
    </>
  );
}

export default DonationQrButton;
