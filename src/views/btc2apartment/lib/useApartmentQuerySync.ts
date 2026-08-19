"use client";

import { useEffect, useState } from "react";
import useBtc2ApartmentStore from "../model/btc2ApartmentStore";
import { buildApartmentQueryUrl, resolveApartmentIDFromQuery } from "./apartmentQuery";

/**
 * 선택한 단지를 URL 쿼리와 양방향으로 맞춘다.
 *
 * - **진입 시**: 쿼리가 저장된 선택을 덮어쓴다. 쿼리가 없거나 목록에 없는 값이면 첫 번째 단지.
 * - **선택 변경 시**: 쿼리를 갱신해 지금 보는 화면이 그대로 공유 가능한 주소가 되게 한다.
 *
 * **리하이드레이션을 기다린 뒤에 맞춰야 한다.** `persist` 의 복원은 첫 effect 보다 늦게
 * 일어나므로, 그냥 마운트 시점에 비교하면 그때는 아직 기본값이라 "쿼리와 같다" 로 판정되고,
 * 곧이어 복원된 값이 그대로 남아 쿼리가 무시된다.
 *
 * `useSearchParams` 대신 `window.location` 을 직접 읽는다. 이 페이지는 정적 생성 대상이라
 * `useSearchParams` 를 쓰면 Suspense 경계가 필요하고, 쓰기를 `router.replace` 로 하면
 * 슬라이드를 넘길 때마다 라우터 렌더가 돌아 캐러셀이 버벅인다.
 * `replaceState` 는 Next 가 공식 지원하는 경로이며 리렌더를 일으키지 않는다.
 */
export function useApartmentQuerySync(
  apartmentID: string,
  setApartmentID: (apartmentID: string) => void,
): void {
  /** 쿼리 기준 정렬이 끝났는지. 끝나기 전에 URL 을 쓰면 복원 전 값이 주소에 박힌다. */
  const [isSyncedFromQuery, setIsSyncedFromQuery] = useState(false);

  useEffect(() => {
    const syncFromQuery = () => {
      const nextApartmentID = resolveApartmentIDFromQuery(window.location.search);

      /**
       * 값이 같으면 건드리지 않는다.
       * `setApartmentID` 는 평형 선택을 `null` 로 되돌리므로, 매 진입마다 호출하면
       * 사용자가 고른 평형이 새로고침만 해도 날아간다.
       */
      if (nextApartmentID !== useBtc2ApartmentStore.getState().apartmentID) {
        setApartmentID(nextApartmentID);
      }

      setIsSyncedFromQuery(true);
    };

    if (useBtc2ApartmentStore.persist.hasHydrated()) {
      syncFromQuery();
      return;
    }

    return useBtc2ApartmentStore.persist.onFinishHydration(syncFromQuery);
  }, [setApartmentID]);

  useEffect(() => {
    if (!isSyncedFromQuery) {
      return;
    }

    const nextUrl = buildApartmentQueryUrl(window.location.href, apartmentID);

    if (nextUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [isSyncedFromQuery, apartmentID]);
}
