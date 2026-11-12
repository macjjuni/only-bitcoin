"use client";

import { useQuery } from "@tanstack/react-query";
import { spaceConfig } from "@/shared/config/space";

/** 워커 캐시(10초)와 합쳐 숫자가 최대 30초 늦음. */
const REFRESH_INTERVAL_MS = 20_000;

// region [Transactions]
const fetchSpaceOccupantCount = async (signal: AbortSignal): Promise<number> => {
  const response = await fetch(spaceConfig.presenceUrl, { signal });
  if (!response.ok) {
    throw new Error(`스페이스 인원수 조회 실패: ${response.status}`);
  }

  const payload: { count?: unknown } = await response.json();
  if (typeof payload.count !== "number" || !Number.isInteger(payload.count) || payload.count < 0) {
    throw new Error("스페이스 인원수 응답 형식이 맞지 않습니다.");
  }

  return payload.count;
};
// endregion

/**
 * 스페이스에 지금 있는 사람 수.
 *
 * 입장하지 않고 숫자만 받음. 백그라운드 탭에서는 폴링을 멈추고, 실패하면
 * 마지막 값을 두지 않고 `undefined` 로 돌려 배지를 숨기게 함. 틀린 숫자보다 없는 편이 나음.
 */
export function useSpaceOccupantCountQuery(isEnabled: boolean): number | undefined {
  // region [Hooks]
  const { data: occupantCount, isError } = useQuery({
    queryKey: ["spaceOccupantCount"],
    queryFn: ({ signal }) => fetchSpaceOccupantCount(signal),
    enabled: isEnabled && spaceConfig.presenceUrl.length > 0,
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  // endregion

  return isError ? undefined : occupantCount;
}
