"use client";

import { Database, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { generateDummyTradeRecords, useDcaFormStore, useDcaStore } from "@/entities/dca";
import { FloatingBannerButton } from "@/shared/ui";
import { isDev } from "@/shared/utils/common";

export default function DcaAddRecordFloatingBanner() {
  // region [Hooks]
  const openForm = useDcaFormStore((state) => state.openForm);
  const addRecord = useDcaStore((state) => state.addRecord);
  const clearRecords = useDcaStore((state) => state.clearRecords);
  // endregion

  // region [Events]
  const onClickAddRecord = () => {
    openForm();
  };

  const onClickGenerateDummy = () => {
    const dummyRecords = generateDummyTradeRecords(10);
    for (const record of dummyRecords) {
      addRecord(record);
    }
  };

  const onClickClearRecords = () => {
    clearRecords();
  };
  // endregion

  // region [Templates]
  // 개발용 더미 데이터 생성·초기화 버튼. 필요할 때 아래 return 문에서 주석을 해제해 사용한다.
  const _DevTemplates = useMemo(
    () =>
      isDev && (
        <>
          <FloatingBannerButton
            className="mb-2"
            onClick={onClickClearRecords}
            aria-label="기록 초기화"
          >
            <Trash2 size={22} className="text-red-500" />
          </FloatingBannerButton>
          <FloatingBannerButton
            className="mb-2"
            onClick={onClickGenerateDummy}
            aria-label="더미 데이터 생성"
          >
            <Database size={22} className="text-amber-500" />
          </FloatingBannerButton>
        </>
      ),
    [isDev],
  );
  // endregion

  return (
    <>
      {/* {_DevTemplates} */}
      <FloatingBannerButton onClick={onClickAddRecord} aria-label="매매 기록 추가">
        <Plus size={28} className="text-black dark:text-white" />
      </FloatingBannerButton>
    </>
  );
}
