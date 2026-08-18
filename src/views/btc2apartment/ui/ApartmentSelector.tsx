"use client";

import { memo, useMemo } from "react";
import { landmarkApartmentList } from "@/entities/apartment";
import { Card, CardContent } from "@/shared/ui";

interface ApartmentSelectorProps {
  selectedApartmentID: string;
  onSelectApartment: (apartmentID: string) => void;
}

/** 랜드마크 단지 선택 목록. */
const ApartmentSelector = ({ selectedApartmentID, onSelectApartment }: ApartmentSelectorProps) => {
  // region [Templates]
  const ApartmentRowListTemplate = useMemo(
    () =>
      landmarkApartmentList.map((landmark) => {
        const isSelected = landmark.apartmentID === selectedApartmentID;

        return (
          <button
            key={landmark.apartmentID}
            type="button"
            onClick={() => onSelectApartment(landmark.apartmentID)}
            className={[
              "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors",
              isSelected ? "bg-bitcoin/10" : "active:bg-neutral-200/60 dark:active:bg-neutral-800",
            ].join(" ")}
          >
            <span className={isSelected ? "text-sm font-bold text-bitcoin" : "text-sm"}>
              {landmark.displayName}
            </span>
            <span className="text-xs text-muted-foreground">
              {landmark.districtName.replace("서울 ", "")} {landmark.legalDongName}
            </span>
          </button>
        );
      }),
    [selectedApartmentID, onSelectApartment],
  );
  // endregion

  return (
    <Card>
      <CardContent className="flex flex-col gap-0.5 p-2">
        <span className="px-1.5 pb-1 pt-0.5 text-xs font-bold text-muted-foreground">
          랜드마크 단지
        </span>
        {ApartmentRowListTemplate}
      </CardContent>
    </Card>
  );
};

const MemoizedApartmentSelector = memo(ApartmentSelector);
MemoizedApartmentSelector.displayName = "ApartmentSelector";

export default MemoizedApartmentSelector;
