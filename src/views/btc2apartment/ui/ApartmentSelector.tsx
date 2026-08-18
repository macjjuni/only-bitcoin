"use client";

import Image from "next/image";
import { memo, useCallback, useMemo, useState } from "react";
import type { Swiper as SwiperType } from "swiper";
import { EffectCoverflow } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { landmarkApartmentList } from "@/entities/apartment";
import "swiper/css";
import "swiper/css/effect-coverflow";

/** apartmentID → 이미지 파일명 매핑. 파일명이 ID와 다른 단지만 등록한다. */
const IMAGE_FILENAME_MAP: Record<string, string> = {
  "banpo-xi": "banpo-zai",
  "acro-river-park": "arco",
  "apgujeong-hyundai-6": "apgujeong-hyundai-6th",
  "tower-palace-1": "tower-palace-1st",
  "jamsil-else": "jamsil-els",
};

function getImagePath(apartmentID: string): string {
  const filename = IMAGE_FILENAME_MAP[apartmentID] ?? apartmentID;
  return `/images/apartments/${filename}.webp`;
}

interface ApartmentSelectorProps {
  selectedApartmentID: string;
  onSelectApartment: (apartmentID: string) => void;
}

/** 랜드마크 단지 캐러셀. 좌우 스와이프로 단지를 탐색하고, 중앙 슬라이드가 선택된다. */
const ApartmentSelector = ({ selectedApartmentID, onSelectApartment }: ApartmentSelectorProps) => {
  // region [Hooks]
  const [isReady, setIsReady] = useState(false);

  const initialSlideIndex = useMemo(
    () =>
      Math.max(
        0,
        landmarkApartmentList.findIndex((item) => item.apartmentID === selectedApartmentID),
      ),
    [],
  );
  // endregion

  // region [Events]
  const onSlideChange = useCallback(
    (swiper: SwiperType) => {
      const apartment = landmarkApartmentList[swiper.activeIndex];

      if (apartment) {
        onSelectApartment(apartment.apartmentID);
      }
    },
    [onSelectApartment],
  );
  // endregion

  return (
    <div className={["-mx-2 transition-opacity duration-500", isReady ? "opacity-100" : "opacity-0"].join(" ")}>
      <Swiper
        effect="coverflow"
        grabCursor
        centeredSlides
        slidesPerView={1.6}
        coverflowEffect={{
          rotate: 0,
          stretch: 0,
          depth: 360,
          modifier: 1,
          slideShadows: false,
        }}
        modules={[EffectCoverflow]}
        initialSlide={initialSlideIndex}
        onAfterInit={() => setIsReady(true)}
        onSlideChange={onSlideChange}
        className="w-full max-w-full"
      >
        {landmarkApartmentList.map((item) => {
          const isSelected = item.apartmentID === selectedApartmentID;

          return (
            <SwiperSlide key={item.apartmentID}>
              <div
                className={[
                  "relative overflow-hidden rounded-xl border-2 transition-all duration-300 origin-center",
                  isSelected
                    ? "scale-100 border-bitcoin"
                    : "scale-90 border-transparent opacity-50",
                ].join(" ")}
              >
                <div className="relative aspect-video">
                  <Image
                    src={getImagePath(item.apartmentID)}
                    alt={item.displayName}
                    fill
                    sizes="(max-width: 524px) 70vw, 370px"
                    className="object-cover"
                    priority={isSelected}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-4">
                  <p className="text-sm font-bold text-white">{item.displayName}</p>
                  <p className="text-[11px] text-white/70">
                    {item.districtName.replace("서울 ", "")} {item.legalDongName}
                  </p>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
};

const MemoizedApartmentSelector = memo(ApartmentSelector);
MemoizedApartmentSelector.displayName = "ApartmentSelector";

export default MemoizedApartmentSelector;
