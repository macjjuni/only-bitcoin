import { describe, expect, it } from "vitest";
import type { BlockTypes } from "@/entities/block";
import { SPACE_BLOCK_DASHBOARD } from "@/entities/space";
import { BILLBOARD_TEXTURE } from "@/views/space/lib/billboardTexture";
import {
  BLOCK_DASHBOARD_PLACEHOLDER,
  BLOCK_DASHBOARD_TEXTURE,
  createBlockDashboardSignature,
  drawBlockDashboard,
  formatBlockHeight,
  formatBlocksToHalving,
  formatElapsed,
  formatHalvingHeight,
  formatHalvingProgress,
  formatLatestBlockMeta,
  formatPoolName,
  formatSubsidy,
  formatTimeToHalving,
  HALVING_SEGMENT_COUNT,
  isBlockFeedStale,
  RECENT_BLOCK_COUNT,
  resolveBlockDashboardState,
  resolveFilledSegmentCount,
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

  it("비율이 패널 geometry 와 같다", () => {
    // 비율이 어긋나면 글자가 늘어나거나 눌린다.
    expect(BLOCK_DASHBOARD_TEXTURE.width / BLOCK_DASHBOARD_TEXTURE.height).toBeCloseTo(
      SPACE_BLOCK_DASHBOARD.width / SPACE_BLOCK_DASHBOARD.height,
      6,
    );
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

describe("네트워크 현황 파생값", () => {
  it("최근 블록을 오래된 것부터 최대 4개 늘어놓는다", () => {
    const blocks = Array.from({ length: 8 }, (_, index) =>
      createBlock({ height: CURRENT_HEIGHT - index, txCount: 3_000 + index }),
    );
    const state = resolveBlockDashboardState(blocks, NOW_MS);

    expect(state.recentBlocks).toHaveLength(RECENT_BLOCK_COUNT);
    expect(state.recentBlocks.map((block) => block.height)).toEqual([
      CURRENT_HEIGHT - 3,
      CURRENT_HEIGHT - 2,
      CURRENT_HEIGHT - 1,
      CURRENT_HEIGHT,
    ]);
    expect(state.recentBlocks.at(-1)?.txCount).toBe(3_000);
    expect(state.txCount).toBe(3_000);
  });

  it("거래 수가 없는 구버전 캐시는 null 로 둔다", () => {
    const state = resolveBlockDashboardState([createBlock()], NOW_MS);

    expect(state.txCount).toBeNull();
    expect(state.recentBlocks[0]?.txCount).toBeNull();
  });

  it("수수료를 채운다", () => {
    const state = resolveBlockDashboardState([createBlock()], NOW_MS, { halfHourFee: 6 });

    expect(state.feeRate).toBe(6);
  });

  it("소켓 연결 전에는 네트워크 값도 비운다", () => {
    const emptyBlock = createBlock({ height: 0, timestamp: 0, poolName: "-", difficulty: 0 });
    const state = resolveBlockDashboardState([emptyBlock], NOW_MS, { halfHourFee: 0 });

    expect(state.recentBlocks).toEqual([]);
    expect(state.feeRate).toBeNull();
  });
});

describe("네트워크 현황 포맷", () => {
  it("최신 블록 줄은 아는 항목만 잇는다", () => {
    const full = resolveBlockDashboardState([createBlock({ txCount: 3_412 })], NOW_MS, {
      halfHourFee: 6,
    });
    const partial = resolveBlockDashboardState([createBlock({ poolName: "-" })], NOW_MS);

    expect(formatLatestBlockMeta(full)).toBe(
      "12분 전 · 거래 3,412건 · 수수료 6 sat/vB · Foundry USA",
    );
    expect(formatLatestBlockMeta(partial)).toBe("12분 전");
  });

  it("반감기 막대는 진행률만큼 칸을 채우되 0 % 초과면 한 칸은 칠한다", () => {
    expect(resolveFilledSegmentCount(null)).toBe(0);
    expect(resolveFilledSegmentCount(0)).toBe(0);
    expect(resolveFilledSegmentCount(0.1)).toBe(1);
    expect(resolveFilledSegmentCount(63.5)).toBe(Math.round(0.635 * HALVING_SEGMENT_COUNT));
    expect(resolveFilledSegmentCount(120)).toBe(HALVING_SEGMENT_COUNT);
  });

  it("화면 글자가 같으면 서명도 같아 다시 그리지 않는다", () => {
    // 경과 초가 달라도 분 표시가 같으면 텍스처를 다시 올리지 않는다.
    const first = resolveBlockDashboardState([createBlock()], NOW_MS);
    const secondLater = resolveBlockDashboardState([createBlock()], NOW_MS + 5_000);
    const minuteLater = resolveBlockDashboardState([createBlock()], NOW_MS + 60_000);

    expect(createBlockDashboardSignature(secondLater)).toBe(createBlockDashboardSignature(first));
    expect(createBlockDashboardSignature(minuteLater)).not.toBe(
      createBlockDashboardSignature(first),
    );
  });
});

describe("우측 상단 상태 배지", () => {
  const traceBadgeLabel = (elapsedMinutes: number): string | null => {
    let label: string | null = null;
    const ignoredDrawingOperation = (): void => undefined;
    const canvasProperties: Record<string, unknown> = {
      measureText: (text: string) => ({ width: text.length * 20 }),
      createLinearGradient: () => ({ addColorStop: ignoredDrawingOperation }),
      fillText: (text: string) => {
        if (text === "LIVE" || text === "DELAYED") {
          label = text;
        }
      },
    };
    const context = new Proxy(canvasProperties, {
      get: (target, property) => Reflect.get(target, property) ?? ignoredDrawingOperation,
    }) as unknown as CanvasRenderingContext2D;
    const block = createBlock({ timestamp: NOW_MS / 1000 - elapsedMinutes * MINUTE });

    drawBlockDashboard(context, resolveBlockDashboardState([block], NOW_MS));

    return label;
  };

  it("블록이 제때 나오면 시세판과 같은 LIVE 배지를 그린다", () => {
    expect(traceBadgeLabel(5)).toBe("LIVE");
  });

  it("블록이 20분 넘게 안 나오면 DELAYED 로 바뀐다", () => {
    expect(traceBadgeLabel(25)).toBe("DELAYED");
  });
});
