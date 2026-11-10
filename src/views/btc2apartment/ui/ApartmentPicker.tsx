"use client";

import {
  KBottomSheet,
  KBottomSheetContent,
  KBottomSheetDescription,
  KBottomSheetHeader,
  KBottomSheetOverlay,
  KBottomSheetTitle,
} from "kku-ui";
import { Check, ChevronsUpDown } from "lucide-react";
import Image from "next/image";
import { memo, useMemo, useState } from "react";
import {
  findLandmarkApartment,
  getApartmentImagePath,
  type LandmarkApartment,
  landmarkApartmentList,
} from "@/entities/apartment";
import { useBitcoinStore } from "@/entities/bitcoin";
import { useMounted } from "@/shared/lib/hooks";
import type { ApartmentPriceHints } from "../lib/apartmentPriceHint";
import { formatBtcCount } from "../lib/buildChartSeries";

interface ApartmentPickerProps {
  selectedApartmentID: string;
  /** 단지별 대표 가격. 목록에서 BTC 환산값을 미리 보여 주는 데 씀. */
  priceHints: ApartmentPriceHints;
  onSelectApartment: (apartmentID: string) => void;
}

interface ApartmentOptionProps {
  landmark: LandmarkApartment;
  isSelected: boolean;
  /** 실시간 시세로 환산한 BTC 수. 시세나 대표 가격이 없으면 null. */
  btcCount: number | null;
  areaInSquareMeter: number | undefined;
  onSelectApartment: (apartmentID: string) => void;
}

interface DistrictGroup {
  districtName: string;
  landmarks: LandmarkApartment[];
}

// region [Privates]
/** `서울 서초구` → `서초구`. 전부 서울이라 앞머리는 뺌. */
const toShortDistrictName = (districtName: string): string => {
  return districtName.replace("서울 ", "");
};

/** 목록 순서( 구별로 이미 묶여 있음 )를 그대로 지키면서 구 단위로 나눔. */
const groupByDistrict = (landmarks: readonly LandmarkApartment[]): DistrictGroup[] => {
  const districtGroups: DistrictGroup[] = [];

  for (const landmark of landmarks) {
    const lastGroup = districtGroups.at(-1);

    if (lastGroup?.districtName === landmark.districtName) {
      lastGroup.landmarks.push(landmark);
    } else {
      districtGroups.push({ districtName: landmark.districtName, landmarks: [landmark] });
    }
  }

  return districtGroups;
};

const DISTRICT_GROUPS = groupByDistrict(landmarkApartmentList);
// endregion

/** 목록의 단지 한 줄. 사진 · 이름 · 동 · BTC 환산값. */
function ApartmentOption({
  landmark,
  isSelected,
  btcCount,
  areaInSquareMeter,
  onSelectApartment,
}: ApartmentOptionProps) {
  // region [Events]
  const onClickApartmentOption = () => {
    onSelectApartment(landmark.apartmentID);
  };
  // endregion

  return (
    <li>
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={onClickApartmentOption}
        className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors active:scale-[0.99] ${
          isSelected ? "bg-bitcoin/10" : ""
        }`}
      >
        <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-foreground/10">
          <Image
            src={getApartmentImagePath(landmark.apartmentID)}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-sm font-bold">
            <span className="truncate">{landmark.displayName}</span>
            {isSelected && <Check size={14} className="shrink-0 text-bitcoin" aria-hidden="true" />}
          </span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            {landmark.legalDongName}
            {areaInSquareMeter !== undefined && (
              <>
                {" · 전용 "}
                <span className="font-number">{areaInSquareMeter}</span>㎡
              </>
            )}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <strong className="font-number block text-sm font-black text-bitcoin">
            {btcCount === null ? "—" : formatBtcCount(btcCount)}
          </strong>
          <span className="font-number block text-[10px] font-bold text-muted-foreground">BTC</span>
        </span>
      </button>
    </li>
  );
}

/**
 * 단지 선택. 지금 고른 단지를 한 줄로 보여 주고, 누르면 아래에서 전체 목록이 올라옴.
 *
 * 예전엔 사진 슬라이드였는데 한 번에 한 곳만 보여서 13곳 중 뒤쪽 단지를 찾기 번거로웠음.
 * 목록에 BTC 환산값을 같이 실어 고르기 전에 단지끼리 비교할 수 있게 함.
 */
const ApartmentPicker = ({
  selectedApartmentID,
  priceHints,
  onSelectApartment,
}: ApartmentPickerProps) => {
  // region [Hooks]
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const bitcoinPriceInKrw = useBitcoinStore((state) => state.bitcoinPrice.krw);
  const isMounted = useMounted();
  const selectedLandmark = useMemo(
    () => findLandmarkApartment(selectedApartmentID),
    [selectedApartmentID],
  );
  // endregion

  // region [Privates]
  /** 실시간 시세가 들어가서 마운트 전에는 비워 둠. 서버 렌더와 값이 달라짐. */
  const resolveBtcCount = (apartmentID: string): number | null => {
    const priceHint = priceHints[apartmentID];

    if (!isMounted || !priceHint || bitcoinPriceInKrw <= 0) {
      return null;
    }
    return priceHint.priceInKrw / bitcoinPriceInKrw;
  };
  // endregion

  // region [Events]
  const onClickOpenSheetButton = () => {
    setIsSheetOpen(true);
  };

  const onSelectApartmentOption = (apartmentID: string) => {
    onSelectApartment(apartmentID);
    setIsSheetOpen(false);
  };
  // endregion

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`단지 선택. 현재 ${selectedLandmark?.displayName ?? "선택 없음"}`}
        onClick={onClickOpenSheetButton}
        className="card-surface flex w-full items-center gap-3 p-2.5 text-left transition-transform active:scale-[0.99]"
      >
        <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-foreground/10">
          {selectedLandmark && (
            <Image
              src={getApartmentImagePath(selectedLandmark.apartmentID)}
              alt=""
              fill
              sizes="56px"
              priority
              className="object-cover"
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-bold leading-snug">
            {selectedLandmark?.displayName ?? "-"}
          </span>
          <span className="mt-0.5 block truncate text-sm text-muted-foreground">
            {selectedLandmark
              ? `${selectedLandmark.districtName} ${selectedLandmark.legalDongName}`
              : ""}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-foreground/10 px-2.5 py-1.5 text-xs font-bold text-muted-foreground">
          <span className="font-number">{landmarkApartmentList.length}</span>곳
          <ChevronsUpDown size={14} aria-hidden="true" />
        </span>
      </button>

      <KBottomSheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <KBottomSheetOverlay />
        <KBottomSheetContent className="z-[51] mx-auto max-w-layout border-border font-pretendard">
          <KBottomSheetHeader>
            <KBottomSheetTitle>단지 선택</KBottomSheetTitle>
          </KBottomSheetHeader>
          {/* 시트의 접근성 설명을 겸함. 없으면 스크린 리더가 대화상자 용도를 못 읽음. */}
          <KBottomSheetDescription className="mb-2 text-xs text-muted-foreground">
            BTC 환산은 단지별 대표 평형의 최근 확정 연도 중앙값을 지금 시세로 나눈 값입니다.
          </KBottomSheetDescription>
          <div className="-mx-2 max-h-[60dvh] overflow-y-auto px-2 pb-4">
            {DISTRICT_GROUPS.map((districtGroup) => (
              <section key={districtGroup.districtName} className="mb-3 last:mb-0">
                <h3 className="mb-1 px-2 text-[11px] font-bold text-muted-foreground">
                  {toShortDistrictName(districtGroup.districtName)}
                </h3>
                <ul className="flex flex-col gap-0.5">
                  {districtGroup.landmarks.map((landmark) => (
                    <ApartmentOption
                      key={landmark.apartmentID}
                      landmark={landmark}
                      isSelected={landmark.apartmentID === selectedApartmentID}
                      btcCount={resolveBtcCount(landmark.apartmentID)}
                      areaInSquareMeter={priceHints[landmark.apartmentID]?.areaInSquareMeter}
                      onSelectApartment={onSelectApartmentOption}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </KBottomSheetContent>
      </KBottomSheet>
    </>
  );
};

const MemoizedApartmentPicker = memo(ApartmentPicker);
MemoizedApartmentPicker.displayName = "ApartmentPicker";

export default MemoizedApartmentPicker;
