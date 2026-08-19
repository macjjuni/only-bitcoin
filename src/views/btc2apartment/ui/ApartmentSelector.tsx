"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const LAST_SLIDE_INDEX = landmarkApartmentList.length - 1;

/**
 * 화살표 버튼.
 *
 * 사진 위에 얹히므로 밝은 사진·어두운 사진 어디서도 읽히도록 반투명 검정 원을 깐다.
 * ( 테마 색을 쓰면 라이트 모드에서 흰 하늘 위에 흰 버튼이 된다 )
 */
const ARROW_BUTTON_CLASS = [
  "absolute top-1/2 z-10 -translate-y-1/2",
  "flex h-9 w-9 items-center justify-center rounded-full",
  "bg-black/45 text-white backdrop-blur-[2px]",
  "transition-opacity duration-200",
].join(" ");

/** 양 끝 슬라이드에서 감출 때. 시각뿐 아니라 클릭도 막는다. */
const ARROW_HIDDEN_CLASS = "pointer-events-none opacity-0";

interface ApartmentSelectorProps {
  selectedApartmentID: string;
  onSelectApartment: (apartmentID: string) => void;
}

/**
 * 랜드마크 단지 캐러셀. 좌우 스와이프 또는 화살표로 단지를 탐색하고,
 * 중앙 슬라이드가 선택된다.
 */
const ApartmentSelector = ({ selectedApartmentID, onSelectApartment }: ApartmentSelectorProps) => {
  // region [Hooks]
  const [isReady, setIsReady] = useState(false);
  const swiperRef = useRef<SwiperType | null>(null);

  /**
   * 첫 렌더에 한 번만 반영되는 값이다.
   *
   * zustand persist 의 복원은 첫 렌더 **뒤에** 일어나므로 재방문이라도 여기서는
   * 항상 기본 단지가 잡힌다. 복원된 단지로 맞추는 일은 아래 Life Cycles 가 맡는다.
   */
  const initialSlideIndex = useMemo(
    () =>
      Math.max(
        0,
        landmarkApartmentList.findIndex((item) => item.apartmentID === selectedApartmentID),
      ),
    [],
  );

  /**
   * 양 끝에서 해당 화살표를 감춘다.
   *
   * Swiper 인스턴스의 `isBeginning` · `isEnd` 는 리렌더를 일으키지 않으므로
   * 슬라이드가 바뀔 때마다 state 로 복사해 둔다.
   */
  const [isBeginning, setIsBeginning] = useState(initialSlideIndex === 0);
  const [isEnd, setIsEnd] = useState(initialSlideIndex === LAST_SLIDE_INDEX);
  // endregion

  // region [Events]
  const onSlideChange = useCallback(
    (swiper: SwiperType) => {
      const apartment = landmarkApartmentList[swiper.activeIndex];

      /**
       * 이미 선택된 단지면 store 를 건드리지 않는다.
       *
       * `setApartmentID` 는 평형 선택을 `null` 로 되돌리므로, 복원용 `slideTo` 가
       * 발화시킨 이 콜백이 그대로 store 를 쓰면 사용자가 고른 평형이 날아간다.
       */
      if (apartment && apartment.apartmentID !== selectedApartmentID) {
        onSelectApartment(apartment.apartmentID);
      }

      setIsBeginning(swiper.isBeginning);
      setIsEnd(swiper.isEnd);
    },
    [onSelectApartment, selectedApartmentID],
  );

  const onSwiperInit = useCallback((swiper: SwiperType) => {
    swiperRef.current = swiper;
  }, []);

  const onClickPrev = useCallback(() => {
    swiperRef.current?.slidePrev();
  }, []);

  const onClickNext = useCallback(() => {
    swiperRef.current?.slideNext();
  }, []);
  // endregion

  // region [Life Cycles]
  /**
   * 뒤늦게 복원된 단지에 캐러셀을 맞춘다.
   *
   * 이게 없으면 재방문 시 카드는 마지막으로 보던 단지를, 캐러셀은 늘 기본 단지를
   * 가리켜 둘이 어긋난다. 스와이프·화살표로 옮긴 경우에는 인덱스가 이미 같아
   * 아무 일도 하지 않는다.
   */
  useEffect(() => {
    const swiper = swiperRef.current;

    if (!swiper) {
      return;
    }

    const targetIndex = landmarkApartmentList.findIndex(
      (item) => item.apartmentID === selectedApartmentID,
    );

    if (targetIndex < 0 || targetIndex === swiper.activeIndex) {
      return;
    }

    // 이동이 아니라 초기 위치 보정이므로 애니메이션 없이 붙인다.
    swiper.slideTo(targetIndex, 0);
    setIsBeginning(swiper.isBeginning);
    setIsEnd(swiper.isEnd);
  }, [selectedApartmentID]);
  // endregion

  return (
    <div
      className={[
        "relative -mx-2 transition-opacity duration-500",
        isReady ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
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
        onSwiper={onSwiperInit}
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

      {/*
        스와이프만으로는 이동할 수 있다는 사실 자체가 보이지 않는다.
        양 끝에서는 눌러도 아무 일이 없으므로 아예 감춘다.
      */}
      <button
        type="button"
        aria-label="이전 단지"
        onClick={onClickPrev}
        className={`${ARROW_BUTTON_CLASS} left-2 ${isBeginning ? ARROW_HIDDEN_CLASS : ""}`}
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        aria-label="다음 단지"
        onClick={onClickNext}
        className={`${ARROW_BUTTON_CLASS} right-2 ${isEnd ? ARROW_HIDDEN_CLASS : ""}`}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

const MemoizedApartmentSelector = memo(ApartmentSelector);
MemoizedApartmentSelector.displayName = "ApartmentSelector";

export default MemoizedApartmentSelector;
