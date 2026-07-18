"use client";

import { Plus } from "lucide-react";
import { useDcaFormStore } from "@/entities/dca";
import { FloatingBannerButton } from "@/shared/ui";

export default function DcaAddRecordFloatingBanner() {
  // region [Hooks]
  const openForm = useDcaFormStore((state) => state.openForm);
  // endregion

  // region [Events]
  const onClickAddRecord = () => {
    openForm();
  };
  // endregion

  return (
    <FloatingBannerButton onClick={onClickAddRecord} aria-label="매매 기록 추가">
      <Plus size={28} className="text-black dark:text-white" />
    </FloatingBannerButton>
  );
}
