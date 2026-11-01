import { describe, expect, it } from "vitest";
import type { BlockTypes } from "@/entities/block";
import { BILLBOARD_TEXTURE } from "@/views/space/lib/billboardTexture";
import {
  BLOCK_DASHBOARD_PLACEHOLDER,
  BLOCK_DASHBOARD_TEXTURE,
  formatBlockHeight,
  formatBlocksToHalving,
  formatElapsed,
  formatHalvingHeight,
  formatHalvingProgress,
  formatPoolName,
  formatSubsidy,
  formatTimeToHalving,
  isBlockFeedStale,
  resolveBlockDashboardState,
} from "@/views/space/lib/blockDashboardTexture";

const MINUTE = 60;
const NOW_MS = 1_762_000_000_000;
/** 2024 반감기(840,000) 이후, 다음 반감기(1,050,000) 이전. */
const CURRENT_HEIGHT = 919_482;

const createBlock = (overrides: Partial<BlockTypes> = {}): BlockTypes => ({
  id: "block-id",
  height: CURRENT_HEIGHT,
  timestamp: NOW_MS / 1000 - 12 * MINUTE,
  size: 1_500_000,
  poolName: "Foundry USA",
  difficulty: 150_000_000_000_000,
  ...overrides,
});

describe("BLOCK_DASHBOARD_TEXTURE", () => {
  it("전광판과 같은 텍스처 규격이다", () => {
    // 같은 벽에 나란히 걸리는 두 판이 다른 격자를 쓰면 선과 글자 높이가 어긋난다.
    expect(BLOCK_DASHBOARD_TEXTURE.width).toBe(BILLBOARD_TEXTURE.width);
    expect(BLOCK_DASHBOARD_TEXTURE.height).toBe(BILLBOARD_TEXTURE.height);
    expect(BLOCK_DASHBOARD_TEXTURE.paddingX).toBe(BILLBOARD_TEXTURE.paddingX);
  });

  it("패널과 같은 16:9 이다", () => {
    // 비율이 어긋나면 글자가 늘어난다.
    expect(BLOCK_DASHBOARD_TEXTURE.width / BLOCK_DASHBOARD_TEXTURE.height).toBeCloseTo(16 / 9, 6);
  });
});

describe("resolveBlockDashboardState", () => {
  it("현재 블록과 반감기 정보를 함께 만든다", () => {
    const state = resolveBlockDashboardState([createBlock()], NOW_MS);

    expect(state.height).toBe(CURRENT_HEIGHT);
    expect(state.elapsedSeconds).toBe(12 * MINUTE);
    expect(state.poolName).toBe("Foundry USA");
    expect(state.subsidy).toBe(3.125);
    expect(state.nextHalvingHeight).toBe(1_050_000);
    expect(state.nextHalvingDate).toBe("2028");
    expect(state.nextSubsidy).toBe(1.5625);
    expect(state.blocksToHalving).toBe(1_050_000 - CURRENT_HEIGHT);
    expect(state.halvingProgressPercent).toBeCloseTo(37.85, 2);
  });

  it("소켓 연결 전 빈 블록은 파생값까지 비운다", () => {
    // 높이 0 을 실제 값처럼 그리면 반감기가 코앞인 것처럼 읽힌다.
    const emptyBlock = createBlock({ height: 0, timestamp: 0, poolName: "-", difficulty: 0 });
    const state = resolveBlockDashboardState([emptyBlock], NOW_MS);

    expect(state.height).toBe(0);
    expect(state.elapsedSeconds).toBeNull();
    expect(state.poolName).toBe("");
    expect(state.subsidy).toBe(0);
    expect(state.nextHalvingHeight).toBe(0);
    expect(state.nextHalvingDate).toBe("");
    expect(state.nextSubsidy).toBe(0);
    expect(state.blocksToHalving).toBeNull();
    expect(state.halvingProgressPercent).toBeNull();
  });

  it("블록 목록이 비어도 터지지 않는다", () => {
    const state = resolveBlockDashboardState([], NOW_MS);

    expect(state.height).toBe(0);
    expect(state.elapsedSeconds).toBeNull();
    expect(state.blocksToHalving).toBeNull();
  });

  it("로컬 시계가 블록보다 뒤처져도 음수 경과를 만들지 않는다", () => {
    const futureBlock = createBlock({ timestamp: NOW_MS / 1000 + 120 });
    const state = resolveBlockDashboardState([futureBlock], NOW_MS);

    expect(state.elapsedSeconds).toBe(0);
  });

  it("풀 이름 자리값(-)은 빈 문자열로 바꾼다", () => {
    const state = resolveBlockDashboardState([createBlock({ poolName: "-" })], NOW_MS);

    expect(state.poolName).toBe("");
  });

  it("반감기 직전 높이에서도 남은 블록이 양수다", () => {
    const state = resolveBlockDashboardState([createBlock({ height: 1_049_999 })], NOW_MS);

    expect(state.blocksToHalving).toBe(1);
    expect(state.nextHalvingHeight).toBe(1_050_000);
  });
});

describe("표시 포맷", () => {
  it("블록 높이와 반감기 높이에 천 단위 구분을 넣는다", () => {
    expect(formatBlockHeight(CURRENT_HEIGHT)).toBe("919,482");
    expect(formatBlockHeight(0)).toBe(BLOCK_DASHBOARD_PLACEHOLDER);
    expect(formatHalvingHeight(1_050_000)).toBe("1,050,000");
    expect(formatHalvingHeight(0)).toBe(BLOCK_DASHBOARD_PLACEHOLDER);
  });

  it("경과 시간을 분·시간·일로 줄여 쓴다", () => {
    expect(formatElapsed(null)).toBe(BLOCK_DASHBOARD_PLACEHOLDER);
    expect(formatElapsed(0)).toBe("방금");
    expect(formatElapsed(59)).toBe("방금");
    expect(formatElapsed(60)).toBe("1분 전");
    expect(formatElapsed(12 * MINUTE)).toBe("12분 전");
    expect(formatElapsed(60 * MINUTE)).toBe("1시간 전");
    expect(formatElapsed(25 * 60 * MINUTE)).toBe("1일 전");
  });

  it("진행률은 소수 한 자리까지 쓴다", () => {
    expect(formatHalvingProgress(null)).toBe(BLOCK_DASHBOARD_PLACEHOLDER);
    expect(formatHalvingProgress(37.85)).toBe("37.9%");
    expect(formatHalvingProgress(0)).toBe("0.0%");
  });

  it("남은 블록을 시간으로 환산할 때 단위를 크게 끊는다", () => {
    // 10분 간격 전제라 확정 날짜가 아니다. "906일" 처럼 적으면 확정처럼 읽힌다.
    expect(formatTimeToHalving(null)).toBe(BLOCK_DASHBOARD_PLACEHOLDER);
    expect(formatTimeToHalving(0)).toBe(BLOCK_DASHBOARD_PLACEHOLDER);
    expect(formatTimeToHalving(100)).toBe("하루 이내");
    expect(formatTimeToHalving(1_440)).toBe("약 10일");
    expect(formatTimeToHalving(14_400)).toBe("약 3개월");
    expect(formatTimeToHalving(130_518)).toBe("약 2.5년");
  });

  it("보조금·남은 블록·풀 이름을 포맷한다", () => {
    expect(formatSubsidy(3.125)).toBe("3.125 BTC");
    expect(formatSubsidy(0)).toBe(BLOCK_DASHBOARD_PLACEHOLDER);
    expect(formatBlocksToHalving(130_518)).toBe("130,518");
    expect(formatBlocksToHalving(null)).toBe(BLOCK_DASHBOARD_PLACEHOLDER);
    expect(formatPoolName("Foundry USA")).toBe("Foundry USA");
    expect(formatPoolName("")).toBe(BLOCK_DASHBOARD_PLACEHOLDER);
  });
});

describe("isBlockFeedStale", () => {
  it("평균 간격의 두 배를 넘기면 오래된 것으로 본다", () => {
    expect(isBlockFeedStale(5 * MINUTE)).toBe(false);
    expect(isBlockFeedStale(19 * MINUTE)).toBe(false);
    expect(isBlockFeedStale(20 * MINUTE)).toBe(true);
  });

  it("경과를 모르면 오래된 것으로 본다", () => {
    // 데이터가 없는 상태를 초록 점으로 보여주면 살아 있는 것처럼 읽힌다.
    expect(isBlockFeedStale(null)).toBe(true);
  });
});
