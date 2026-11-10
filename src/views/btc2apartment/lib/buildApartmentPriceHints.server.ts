import { landmarkApartmentList } from "@/entities/apartment";
import { getArchivedYearPoints } from "@/entities/apartment/server";
import { type ApartmentPriceHints, resolveLatestPriceHint } from "./apartmentPriceHint";

/**
 * 모든 단지의 대표 가격을 아카이브에서 한 번에 뽑음. 서버에서만 부름.
 *
 * 목록에서 13곳을 비교하려면 가격이 전부 필요한데, 클라이언트는 고른 단지 것만 받아 옴.
 * 단지마다 요청을 보내는 대신 이미 있는 확정 연도 아카이브에서 기본 평형 값만 추려 넘김.
 * 아카이브 원본( 90KB )은 클라이언트 번들에 안 실리고 이 작은 표만 내려감.
 */
export const buildApartmentPriceHints = (): ApartmentPriceHints => {
  const priceHints: ApartmentPriceHints = {};

  for (const landmark of landmarkApartmentList) {
    const priceHint = resolveLatestPriceHint(
      getArchivedYearPoints(landmark.apartmentID),
      landmark.defaultAreaInSquareMeter,
    );

    if (priceHint) {
      priceHints[landmark.apartmentID] = priceHint;
    }
  }

  return priceHints;
};
