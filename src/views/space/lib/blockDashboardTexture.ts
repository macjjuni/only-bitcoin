import type { BlockTypes, FeesTypes } from "@/entities/block";
import {
  calcPercentage,
  getCurrentBlockSubsidy,
  getNextHalvingData,
  TARGET_BLOCK_INTERVAL_SECONDS,
} from "@/entities/block";
import {
  drawFittedText,
  drawScreenBackdrop,
  drawScreenLiveBadge,
  NUMERIC_FONT_STACK,
  resolveFontSpec,
  SANS_FONT_STACK,
  SCREEN_COLORS,
  SCREEN_HEADLINE_FONT_SIZE_PX,
  SCREEN_TEXTURE,
} from "./screenCanvas";

/**
 * 메인 전광판 오른쪽 칸, 비트코인 네트워크 현황 텍스처.
 *
 * 시안(`assets/screen_A.png`) 오른쪽 판을 옮겼음. 위에서부터 최신 블록 번호,
 * 최근 블록 4개 체인, 다음 반감기 진행 막대 순. 하단 지표(해시레이트·난이도·
 * 공급량)는 폰에서 안 읽혀서 빼고 그 자리만큼 체인과 반감기를 키웠음.
 * 왼쪽 시세 판과 같은 바탕·팔레트·여백을 써서 액자 안에서 한 벽으로 읽힘.
 */

/** 텍스처 규격. 왼쪽 시세 판(`BILLBOARD_TEXTURE`)과 같은 값이어야 함. */
export const BLOCK_DASHBOARD_TEXTURE = {
  width: SCREEN_TEXTURE.width,
  height: SCREEN_TEXTURE.height,
  paddingX: SCREEN_TEXTURE.paddingX,
} as const;

export const BLOCK_DASHBOARD_PLACEHOLDER = "—";

/** 체인에 늘어놓는 최근 블록 수. 6개면 칸이 작아 폰에서 숫자가 안 읽혔음. */
export const RECENT_BLOCK_COUNT = 4;

/** 반감기 막대의 칸 수. 칸으로 끊어야 멀리서도 진행 정도가 셈처럼 읽힘. */
export const HALVING_SEGMENT_COUNT = 40;

/** 블록 테두리·연결선·반감기 막대·진행률에 쓰는 흰색. 주황만 쓰면 강조가 묻혀서 바꿈. */
const ACCENT_WHITE = "#ffffff";

/** 블록 안 거래 수·수수료 줄 색. 기본 흐린 글자(`labelMuted`)는 멀리서 안 읽혀서 조금 밝게 씀. */
const SOFT_LABEL = "#cdbba3";

const COLORS = SCREEN_COLORS;

/**
 * 1600 × 1200 레이아웃.
 *
 * 세로 예산: 헤더 170 · 최신 블록 280 · 블록 체인 240 · 반감기 470.
 * 반감기 아래는 진행률·보상 한 줄, 남은 블록 한 줄로 나눠 글자를 키웠음.
 */
const LAYOUT = {
  title: { x: 84, y: 124, fontSize: 64 },
  /** 시세판 원화 가격 줄(중심 290)과 높이를 맞췄음. 두 판의 큰 숫자가 한 줄로 읽힘. */
  latestHeight: { x: 84, y: 290, fontSize: SCREEN_HEADLINE_FONT_SIZE_PX, maxWidth: 1432 },
  latestMeta: { x: 86, y: 392, fontSize: 40, maxWidth: 1430 },
  /** 수수료 3단계 줄. 메타 줄에 같이 넣으면 너무 길어져 따로 뺐음. */
  feeRates: { x: 86, y: 448, fontSize: 40, maxWidth: 1430 },
  chain: { top: 502, height: 200, gap: 56, radius: 16, connectorHeight: 4 },
  chainHeight: { offsetY: 78, fontSize: 64 },
  chainTx: { offsetY: 143, fontSize: 46 },
  halvingTitle: { x: 84, y: 790, fontSize: 52 },
  halvingAside: { x: 1516, y: 794, fontSize: 36 },
  halvingBar: { top: 840, height: 92, gap: 8 },
  halvingPercent: { x: 84, y: 1012, fontSize: 80 },
  halvingReward: { x: 1516, y: 1016, fontSize: 46 },
  /** 진행률 줄 아래 따로 둠. 한 줄에 셋을 넣으면 글자를 키울 수 없었음. */
  halvingRemain: { x: 86, y: 1098, fontSize: 42, maxWidth: 1430 },
} as const;

/** mempool.space 추천 수수료 3단계. 빠름은 다음 블록, 보통은 30분, 느림은 1시간 안 확정. */
export interface BlockFeeRates {
  fastest: number | null;
  halfHour: number | null;
  hour: number | null;
}

export interface RecentBlock {
  height: number;
  /** 블록 거래 수. 구버전 캐시처럼 모르면 `null`. */
  txCount: number | null;
}

export interface BlockDashboardState {
  /** mempool.space 소켓 연결 여부. 상태 배지가 이 값만 봄. */
  isConnected: boolean;
  /** 최신 블록 높이. 아직 모르면 0. */
  height: number;
  /** 채굴 후 경과 초. 모르면 `null`. */
  elapsedSeconds: number | null;
  poolName: string;
  /** 최신 블록 거래 수. 모르면 `null`. */
  txCount: number | null;
  /** 확정 속도별 수수료(sat/vB). 모르는 단계는 `null`. */
  feeRates: BlockFeeRates;
  /** 최근 블록. **오래된 것부터** 최신 순이라 체인 오른쪽 끝이 최신임. */
  recentBlocks: readonly RecentBlock[];
  /** 현재 블록 보조금(BTC). */
  subsidy: number;
  /** 다음 반감기 블록 높이. 모르면 0. */
  nextHalvingHeight: number;
  /** 다음 반감기 예상 시점 표기(`2028`). 모르면 빈 문자열. */
  nextHalvingDate: string;
  /** 반감기 이후 블록 보조금(BTC). */
  nextSubsidy: number;
  /** 다음 반감기까지 남은 블록 수. 모르면 `null`. */
  blocksToHalving: number | null;
  /** 현재 반감기 구간 진행률(%). 모르면 `null`. */
  halvingProgressPercent: number | null;
}

// region [Privates]
const formatInteger = (value: number): string => {
  return Number.isFinite(value) ? Math.round(value).toLocaleString("en-US") : "";
};

const isPositiveNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
};
// endregion

/**
 * 스토어 값을 현황판이 그릴 상태로 바꾼다.
 *
 * 높이 0 은 "소켓 연결 전" 임. 그 상태를 실제 값처럼 그리면 블록이 0번이고
 * 반감기가 코앞인 것처럼 읽힘. 그래서 높이가 없으면 파생값도 비움.
 */
export const resolveBlockDashboardState = (
  blocks: readonly BlockTypes[],
  nowMs: number,
  fees?: Partial<Pick<FeesTypes, "fastestFee" | "halfHourFee" | "hourFee">>,
  isConnected = false,
): BlockDashboardState => {
  const latestBlock = blocks[0];
  const height = latestBlock && latestBlock.height > 0 ? latestBlock.height : 0;
  const timestampMs = latestBlock && latestBlock.timestamp > 0 ? latestBlock.timestamp * 1000 : 0;
  const nextHalving = height > 0 ? getNextHalvingData(height) : null;
  const nextHalvingHeight = nextHalving?.blockHeight ?? 0;
  const recentBlocks = blocks
    .filter((block) => block.height > 0)
    .slice(0, RECENT_BLOCK_COUNT)
    .map((block) => ({
      height: block.height,
      txCount: isPositiveNumber(block.txCount) ? block.txCount : null,
    }))
    .reverse();

  return {
    isConnected,
    height,
    // 로컬 시계가 앞서면 음수가 나옴. 0 으로 깎아 "방금" 으로 읽히게 함.
    elapsedSeconds: timestampMs > 0 ? Math.max(0, Math.floor((nowMs - timestampMs) / 1000)) : null,
    poolName: latestBlock?.poolName && latestBlock.poolName !== "-" ? latestBlock.poolName : "",
    txCount: height > 0 && isPositiveNumber(latestBlock?.txCount) ? latestBlock.txCount : null,
    feeRates: {
      fastest: isPositiveNumber(fees?.fastestFee) ? fees.fastestFee : null,
      halfHour: isPositiveNumber(fees?.halfHourFee) ? fees.halfHourFee : null,
      hour: isPositiveNumber(fees?.hourFee) ? fees.hourFee : null,
    },
    recentBlocks,
    subsidy: height > 0 ? getCurrentBlockSubsidy(height) : 0,
    nextHalvingHeight,
    nextHalvingDate: nextHalving?.date ?? "",
    nextSubsidy: nextHalving ? Number(nextHalving.blockReward) : 0,
    blocksToHalving: nextHalvingHeight > height ? nextHalvingHeight - height : null,
    halvingProgressPercent: height > 0 ? calcPercentage(nextHalvingHeight, height) : null,
  };
};

export const formatBlockHeight = (height: number): string => {
  return height > 0 ? formatInteger(height) : BLOCK_DASHBOARD_PLACEHOLDER;
};

/** 경과 시간. 초 단위는 보여주지 않음. 1초마다 바뀌면 눈이 따라감. */
export const formatElapsed = (elapsedSeconds: number | null): string => {
  if (elapsedSeconds === null) {
    return BLOCK_DASHBOARD_PLACEHOLDER;
  }
  if (elapsedSeconds < 60) {
    return "방금";
  }

  const minutes = Math.floor(elapsedSeconds / 60);

  if (minutes < 60) {
    return `${minutes}분 전`;
  }

  const hours = Math.floor(minutes / 60);

  return hours < 24 ? `${hours}시간 전` : `${Math.floor(hours / 24)}일 전`;
};

/** 보조금. `1.56250000` 같은 꼬리 0 은 `Number` 가 떼어 줌. */
export const formatSubsidy = (subsidy: number): string => {
  return subsidy > 0 ? `${subsidy} BTC` : BLOCK_DASHBOARD_PLACEHOLDER;
};

export const formatBlocksToHalving = (blocksToHalving: number | null): string => {
  return blocksToHalving === null || blocksToHalving <= 0
    ? BLOCK_DASHBOARD_PLACEHOLDER
    : formatInteger(blocksToHalving);
};

export const formatHalvingHeight = (nextHalvingHeight: number): string => {
  return nextHalvingHeight > 0 ? formatInteger(nextHalvingHeight) : BLOCK_DASHBOARD_PLACEHOLDER;
};

export const formatHalvingProgress = (halvingProgressPercent: number | null): string => {
  return halvingProgressPercent === null
    ? BLOCK_DASHBOARD_PLACEHOLDER
    : `${halvingProgressPercent.toFixed(1)}%`;
};

/**
 * 남은 블록을 시간으로 환산한다.
 *
 * 10분 간격이 전제라 정확한 날짜가 아님. 그래서 `약` 을 붙이고 단위도 크게
 * 끊음. "906일" 처럼 적으면 확정된 날짜처럼 읽힘.
 */
export const formatTimeToHalving = (blocksToHalving: number | null): string => {
  if (blocksToHalving === null || blocksToHalving <= 0) {
    return BLOCK_DASHBOARD_PLACEHOLDER;
  }

  const days = (blocksToHalving * TARGET_BLOCK_INTERVAL_SECONDS) / 86_400;

  if (days < 1) {
    return "하루 이내";
  }
  if (days < 60) {
    return `약 ${Math.round(days)}일`;
  }

  const months = days / 30.44;

  return months < 24 ? `약 ${Math.round(months)}개월` : `약 ${(days / 365.25).toFixed(1)}년`;
};

export const formatPoolName = (poolName: string): string => {
  return poolName === "" ? BLOCK_DASHBOARD_PLACEHOLDER : poolName;
};

/**
 * 네트워크판 접속 표시 기준. 시세판(`resolveBillboardOnlineStatus`)과 같은 뜻임.
 *
 * 블록이 늦는 것과 우리가 끊긴 것은 다른 일임. 블록 간격은 평균 10분이어도
 * 20분을 넘길 확률이 13% 라, 그걸 배지에 섞으면 네트워크가 멀쩡한데도 하루
 * 세 시간 넘게 경고가 떠 있었음. 늦는 건 "N분 전" 이 이미 말해 줌.
 *
 * 소켓이 붙어도 블록을 한 번도 못 받았으면 보여 줄 게 없어 꺼진 것으로 봄.
 */
export const resolveBlockFeedOnlineStatus = (
  state: Pick<BlockDashboardState, "isConnected" | "height">,
): boolean => {
  return state.isConnected && state.height > 0;
};

/** 최신 블록 아래 한 줄. 모르는 항목은 빼고 잇기만 함. */
export const formatLatestBlockMeta = (state: BlockDashboardState): string => {
  if (state.height <= 0) {
    return "멤풀 연결을 기다리는 중";
  }

  return [
    formatElapsed(state.elapsedSeconds),
    state.txCount === null ? null : `거래 ${formatInteger(state.txCount)}건`,
    state.poolName === "" ? null : state.poolName,
  ]
    .filter((part): part is string => part !== null && part !== BLOCK_DASHBOARD_PLACEHOLDER)
    .join(" · ");
};

/**
 * 수수료 한 단계 값.
 *
 * 요즘은 1 sat/vB 아래(0.5 등)도 와서 정수로 깎으면 "0" 이 찍혔음. 10 미만은
 * 소수 한 자리까지 쓰고, 끝이 .0 이면 뗌.
 */
export const formatFeeRate = (feeRate: number): string => {
  if (feeRate >= 10) {
    return formatInteger(Math.round(feeRate));
  }

  return String(Number(feeRate.toFixed(1)));
};

/** 수수료 줄. 모르는 단계는 빼고, 하나도 없으면 빈 문자열. */
export const formatFeeRates = (feeRates: BlockFeeRates): string => {
  const parts = [
    feeRates.fastest === null ? null : `빠름 ${formatFeeRate(feeRates.fastest)}`,
    feeRates.halfHour === null ? null : `보통 ${formatFeeRate(feeRates.halfHour)}`,
    feeRates.hour === null ? null : `느림 ${formatFeeRate(feeRates.hour)}`,
  ].filter((part): part is string => part !== null);

  return parts.length === 0 ? "" : `수수료  ${parts.join(" · ")} sat/vB`;
};

/** 칸 수 중 채울 칸. 0 % 초과면 최소 한 칸은 칠해 진행 중임을 보여 줌. */
export const resolveFilledSegmentCount = (percent: number | null): number => {
  if (percent === null || !Number.isFinite(percent) || percent <= 0) {
    return 0;
  }

  return Math.min(
    HALVING_SEGMENT_COUNT,
    Math.max(1, Math.round((percent / 100) * HALVING_SEGMENT_COUNT)),
  );
};

/**
 * 반감기 막대 한 칸의 텍스처 좌표.
 *
 * 텍스처 그리기와 끝 칸 깜빡임(`HalvingSegmentBlink`)이 같은 자리를 쓰게 한 곳에서 계산함.
 */
export const resolveHalvingSegmentRect = (
  index: number,
): { x: number; y: number; width: number; height: number } => {
  const { top, height, gap } = LAYOUT.halvingBar;
  const left = BLOCK_DASHBOARD_TEXTURE.paddingX;
  const totalWidth = BLOCK_DASHBOARD_TEXTURE.width - left * 2;
  const segmentWidth = (totalWidth - gap * (HALVING_SEGMENT_COUNT - 1)) / HALVING_SEGMENT_COUNT;

  return { x: left + (segmentWidth + gap) * index, y: top, width: segmentWidth, height };
};

/**
 * 다시 그릴지 가리는 서명. 화면에 찍히는 글자만 모았음.
 *
 * 값 자체로 비교하면 경과 초가 매초 달라 매번 다시 그림. 표시가 바뀔 때만
 * 큰 텍스처를 다시 올림.
 */
export const createBlockDashboardSignature = (state: BlockDashboardState): string => {
  return [
    formatBlockHeight(state.height),
    formatLatestBlockMeta(state),
    formatFeeRates(state.feeRates),
    resolveBlockFeedOnlineStatus(state),
    state.recentBlocks.map((block) => `${block.height}:${block.txCount ?? ""}`).join(","),
    formatHalvingProgress(state.halvingProgressPercent),
    formatBlocksToHalving(state.blocksToHalving),
  ].join("|");
};

// region [Privates]
const drawLatestBlock = (context: CanvasRenderingContext2D, state: BlockDashboardState): void => {
  context.textAlign = "left";
  context.textBaseline = "middle";

  const heightText =
    state.height > 0 ? `#${formatBlockHeight(state.height)}` : BLOCK_DASHBOARD_PLACEHOLDER;

  context.fillStyle = COLORS.brand;
  drawFittedText(context, heightText, {
    x: LAYOUT.latestHeight.x,
    y: LAYOUT.latestHeight.y,
    fontWeight: 800,
    maxFontSizePx: LAYOUT.latestHeight.fontSize,
    maxWidth: LAYOUT.latestHeight.maxWidth,
    fontStack: NUMERIC_FONT_STACK,
  });

  context.fillStyle = COLORS.label;
  drawFittedText(context, formatLatestBlockMeta(state), {
    x: LAYOUT.latestMeta.x,
    y: LAYOUT.latestMeta.y,
    fontWeight: 600,
    maxFontSizePx: LAYOUT.latestMeta.fontSize,
    maxWidth: LAYOUT.latestMeta.maxWidth,
    fontStack: SANS_FONT_STACK,
  });

  // 소켓 연결 전에는 수수료도 의미가 없어 비워 둠.
  context.fillStyle = SOFT_LABEL;
  drawFittedText(context, state.height > 0 ? formatFeeRates(state.feeRates) : "", {
    x: LAYOUT.feeRates.x,
    y: LAYOUT.feeRates.y,
    fontWeight: 600,
    maxFontSizePx: LAYOUT.feeRates.fontSize,
    maxWidth: LAYOUT.feeRates.maxWidth,
    fontStack: SANS_FONT_STACK,
  });
};

/**
 * 최근 블록 체인. 오른쪽 끝이 최신이고 주황으로 꽉 채움.
 *
 * 블록이 6개보다 적으면(연결 직후) 빈 칸을 흐린 테두리로 남겨 자리가 흔들리지 않게 함.
 */
const drawBlockChain = (
  context: CanvasRenderingContext2D,
  blocks: readonly RecentBlock[],
): void => {
  const { top, height, gap, radius, connectorHeight } = LAYOUT.chain;
  const left = BLOCK_DASHBOARD_TEXTURE.paddingX;
  const totalWidth = BLOCK_DASHBOARD_TEXTURE.width - left * 2;
  const boxWidth = (totalWidth - gap * (RECENT_BLOCK_COUNT - 1)) / RECENT_BLOCK_COUNT;
  const emptySlots = RECENT_BLOCK_COUNT - blocks.length;

  for (let slot = 0; slot < RECENT_BLOCK_COUNT; slot += 1) {
    const x = left + (boxWidth + gap) * slot;
    const block = slot >= emptySlots ? blocks[slot - emptySlots] : undefined;
    const isLatest = block !== undefined && slot === RECENT_BLOCK_COUNT - 1;
    const centerX = x + boxWidth / 2;

    if (slot > 0) {
      context.fillStyle = block ? ACCENT_WHITE : COLORS.segmentEmpty;
      context.fillRect(x - gap, top + height / 2 - connectorHeight / 2, gap, connectorHeight);
    }

    context.beginPath();
    context.roundRect(x, top, boxWidth, height, radius);

    if (isLatest) {
      context.fillStyle = COLORS.brand;
      context.fill();
    } else {
      context.fillStyle = COLORS.surfaceDeep;
      context.fill();
      context.strokeStyle = block ? ACCENT_WHITE : COLORS.segmentEmpty;
      context.lineWidth = 3;
      context.stroke();
    }

    if (!block) {
      continue;
    }

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = isLatest ? COLORS.onAccent : COLORS.label;
    drawFittedText(context, formatInteger(block.height), {
      x: centerX,
      y: top + LAYOUT.chainHeight.offsetY,
      fontWeight: 700,
      maxFontSizePx: LAYOUT.chainHeight.fontSize,
      maxWidth: boxWidth - 24,
      fontStack: NUMERIC_FONT_STACK,
    });

    context.fillStyle = isLatest ? COLORS.onAccent : SOFT_LABEL;
    drawFittedText(
      context,
      block.txCount === null ? "— tx" : `${formatInteger(block.txCount)} tx`,
      {
        x: centerX,
        y: top + LAYOUT.chainTx.offsetY,
        fontWeight: 500,
        maxFontSizePx: LAYOUT.chainTx.fontSize,
        maxWidth: boxWidth - 24,
        fontStack: NUMERIC_FONT_STACK,
      },
    );
  }
};

/** 칸으로 끊은 반감기 막대. 채운 칸은 흰색, 남은 칸은 어두운 갈색. */
const drawHalvingSegments = (context: CanvasRenderingContext2D, percent: number | null): void => {
  const filledCount = resolveFilledSegmentCount(percent);

  for (let index = 0; index < HALVING_SEGMENT_COUNT; index += 1) {
    const { x, y, width, height } = resolveHalvingSegmentRect(index);

    context.fillStyle = index < filledCount ? ACCENT_WHITE : COLORS.segmentEmpty;
    context.fillRect(x, y, width, height);
  }
};

const drawHalving = (context: CanvasRenderingContext2D, state: BlockDashboardState): void => {
  context.textBaseline = "middle";

  context.textAlign = "left";
  context.fillStyle = COLORS.label;
  context.font = resolveFontSpec(800, LAYOUT.halvingTitle.fontSize, SANS_FONT_STACK);
  context.fillText("다음 반감기", LAYOUT.halvingTitle.x, LAYOUT.halvingTitle.y);

  const asideParts = [
    state.nextHalvingHeight > 0 ? `블록 ${formatHalvingHeight(state.nextHalvingHeight)}` : null,
    state.nextHalvingDate === "" ? null : `${state.nextHalvingDate}년 예상`,
  ].filter((part): part is string => part !== null);

  context.textAlign = "right";
  context.fillStyle = COLORS.labelMuted;
  context.font = resolveFontSpec(500, LAYOUT.halvingAside.fontSize, SANS_FONT_STACK);
  context.fillText(asideParts.join(" · "), LAYOUT.halvingAside.x, LAYOUT.halvingAside.y);

  drawHalvingSegments(context, state.halvingProgressPercent);

  context.textAlign = "left";
  context.fillStyle = ACCENT_WHITE;
  context.font = resolveFontSpec(800, LAYOUT.halvingPercent.fontSize, NUMERIC_FONT_STACK);
  context.fillText(
    formatHalvingProgress(state.halvingProgressPercent),
    LAYOUT.halvingPercent.x,
    LAYOUT.halvingPercent.y,
  );

  const remainText =
    state.blocksToHalving === null
      ? ""
      : `남은 블록 ${formatBlocksToHalving(state.blocksToHalving)} · ${formatTimeToHalving(state.blocksToHalving)}`;

  context.fillStyle = COLORS.label;
  drawFittedText(context, remainText, {
    x: LAYOUT.halvingRemain.x,
    y: LAYOUT.halvingRemain.y,
    fontWeight: 500,
    maxFontSizePx: LAYOUT.halvingRemain.fontSize,
    maxWidth: LAYOUT.halvingRemain.maxWidth,
    fontStack: SANS_FONT_STACK,
  });

  const rewardText =
    state.subsidy > 0 && state.nextSubsidy > 0
      ? `보상 ${state.subsidy} → ${state.nextSubsidy} BTC`
      : "";

  context.textAlign = "right";
  context.font = resolveFontSpec(700, LAYOUT.halvingReward.fontSize, NUMERIC_FONT_STACK);
  context.fillText(rewardText, LAYOUT.halvingReward.x, LAYOUT.halvingReward.y);
};

// endregion

/** 네트워크 현황판 한 장을 그린다. */
export const drawBlockDashboard = (
  context: CanvasRenderingContext2D,
  state: BlockDashboardState,
): void => {
  drawScreenBackdrop(context);

  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = COLORS.label;
  context.font = resolveFontSpec(800, LAYOUT.title.fontSize, SANS_FONT_STACK);
  context.fillText("비트코인 네트워크", LAYOUT.title.x, LAYOUT.title.y);

  drawScreenLiveBadge(context, resolveBlockFeedOnlineStatus(state) ? "live" : "offline");
  drawLatestBlock(context, state);
  drawBlockChain(context, state.recentBlocks);
  drawHalving(context, state);
};
