import type { BlockTypes } from "@/entities/block";
import {
  calcPercentage,
  getCurrentBlockSubsidy,
  getNextHalvingData,
  TARGET_BLOCK_INTERVAL_SECONDS,
} from "@/entities/block";
import {
  BILLBOARD_COLORS,
  BILLBOARD_MIN_FONT_SIZE_PX,
  BILLBOARD_PLACEHOLDER,
  resolveFittedFontSize,
} from "./billboardTexture";

/**
 * 비트코인 블록 현황판 텍스처.
 *
 * **전광판과 같은 1600 × 900** 이고 색·여백·행 패널 규격도 전광판에서 그대로
 * 가져온다(`BILLBOARD_COLORS`). 같은 벽에 나란히 걸리는 두 판이 서로 다른
 * 디자인을 쓰면 벽이 두 개로 쪼개져 보인다.
 */
export const BLOCK_DASHBOARD_TEXTURE = {
  width: 1600,
  height: 900,
  paddingX: 60,
} as const;

export const BLOCK_DASHBOARD_PLACEHOLDER = BILLBOARD_PLACEHOLDER;

/** 블록이 이 시간을 넘겨 안 나오면 "지연" 으로 본다. 평균 10분의 두 배. */
const STALE_BLOCK_SECONDS = 20 * 60;

const SANS_FONT_STACK =
  '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';

/**
 * 전광판 레이아웃을 그대로 따른다.
 *
 * 헤더·구분선·행 패널의 좌표는 전광판(`billboardTexture.ts` 의 `LAYOUT`)과 같은
 * 값이다. 두 판을 나란히 봤을 때 글자 높이와 패널 선이 어긋나지 않아야 한다.
 */
const LAYOUT = {
  logo: { centerX: 106, centerY: 80, radius: 44 },
  title: { x: 176, y: 82, fontSize: 64 },
  /** 전광판의 `BTC` 알약은 세 글자라 42 px 이 들어가지만 일곱 글자는 넘친다. */
  badgeText: { x: 544, y: 82, fontSize: 32 },
  badge: { x: 452, y: 52, width: 184, height: 60, radius: 12 },
  statusBadge: { x: 1338, y: 52, width: 176, height: 60, radius: 30 },
  statusDot: { x: 1366, y: 82, radius: 9 },
  statusText: { x: 1445, y: 82, fontSize: 28 },
  headerDividerY: 132,
  rows: {
    height: { centerY: 220, label: "블록", unit: "HEIGHT" },
    pool: { centerY: 368, label: "채굴", unit: "POOL" },
  },
  rowPanel: { x: 56, width: 1488, height: 132, radius: 16, dividerXs: [252, 1104] },
  rowLabel: { x: 84, fontSize: 52, offsetY: -18 },
  rowUnit: { x: 84, fontSize: 30, offsetY: 30 },
  rowValue: { x: 288, fontSize: 108, maxWidth: 800 },
  rowAside: { x: 1140, fontSize: 56, maxWidth: 380, offsetY: 14 },
  rowAsideLabel: { x: 1140, fontSize: 24, offsetY: -40 },
  sectionTitle: { x: 60, y: 468, fontSize: 38 },
  sectionSubtitle: { x: 268, y: 471, fontSize: 29 },
  /** 진행률은 섹션 제목 줄 오른쪽 끝에 붙인다. 바 위에 겹쳐 쓰면 읽기 어렵다. */
  progressLabel: { x: 1544, y: 468, fontSize: 40 },
  progressBar: { x: 56, y: 512, width: 1488, height: 28, radius: 14 },
  /** 반감기 지표 3열. 전광판 차트가 쓰던 아래 영역을 채운다. */
  metricPanel: { x: 56, top: 580, width: 1488, height: 264, radius: 16, columns: 3 },
  metricLabel: { fontSize: 30, offsetY: -50 },
  metricValue: { fontSize: 72, offsetY: 30 },
} as const;

export interface BlockDashboardState {
  /** 최신 블록 높이. 아직 모르면 0. */
  height: number;
  /** 채굴 후 경과 초. 모르면 `null`. */
  elapsedSeconds: number | null;
  poolName: string;
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
const resolveFontSpec = (fontWeight: number, fontSizePx: number): string => {
  return `${fontWeight} ${fontSizePx}px ${SANS_FONT_STACK}`;
};

const formatInteger = (value: number): string => {
  return Number.isFinite(value) ? Math.round(value).toLocaleString("en-US") : "";
};
// endregion

/**
 * 스토어 값을 현황판이 그릴 상태로 바꾼다.
 *
 * 높이 0 은 "소켓 연결 전" 이다. 그 상태를 실제 값처럼 그리면 블록이 0번이고
 * 반감기가 코앞인 것처럼 읽힌다. 그래서 높이가 없으면 파생값도 비운다.
 */
export const resolveBlockDashboardState = (
  blocks: readonly BlockTypes[],
  nowMs: number,
): BlockDashboardState => {
  const latestBlock = blocks[0];
  const height = latestBlock && latestBlock.height > 0 ? latestBlock.height : 0;
  const timestampMs = latestBlock && latestBlock.timestamp > 0 ? latestBlock.timestamp * 1000 : 0;
  const nextHalving = height > 0 ? getNextHalvingData(height) : null;
  const nextHalvingHeight = nextHalving?.blockHeight ?? 0;

  return {
    height,
    // 로컬 시계가 앞서면 음수가 나온다. 0 으로 깎아 "방금" 으로 읽히게 한다.
    elapsedSeconds: timestampMs > 0 ? Math.max(0, Math.floor((nowMs - timestampMs) / 1000)) : null,
    poolName: latestBlock?.poolName && latestBlock.poolName !== "-" ? latestBlock.poolName : "",
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

/** 경과 시간. 초 단위는 보여주지 않는다 — 1초마다 바뀌면 눈이 따라간다. */
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

/** H/s 를 EH/s·PH/s 로 줄인다. 현재 네트워크는 EH/s 대다. */
export const formatHashrate = (hashrate: number): string => {
  if (!Number.isFinite(hashrate) || hashrate <= 0) {
    return BLOCK_DASHBOARD_PLACEHOLDER;
  }

  const exa = hashrate / 1e18;

  if (exa >= 1) {
    return `${exa.toFixed(0)} EH/s`;
  }

  const peta = hashrate / 1e15;

  return peta >= 1 ? `${peta.toFixed(0)} PH/s` : `${(hashrate / 1e12).toFixed(0)} TH/s`;
};

/** 단위는 라벨에 적는다. 값 칸에 넣으면 숫자 자체가 작아진다. */
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
 * 10분 간격이 전제라 정확한 날짜가 아니다. 그래서 `약` 을 붙이고 단위도 크게
 * 끊는다. "906일" 처럼 적으면 확정된 날짜처럼 읽힌다.
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

/** 블록이 평균 간격의 두 배를 넘겨 안 나오면 상태 배지를 회색으로 돌린다. */
export const isBlockFeedStale = (elapsedSeconds: number | null): boolean => {
  return elapsedSeconds === null || elapsedSeconds >= STALE_BLOCK_SECONDS;
};

// region [Privates]
/** 가용 폭을 넘지 않도록 크기를 줄여 그린다. 폰트 지정은 이 함수만 한다. */
const drawFittedText = (
  context: CanvasRenderingContext2D,
  text: string,
  options: {
    x: number;
    y: number;
    fontWeight: number;
    maxFontSizePx: number;
    maxWidth: number;
    minFontSizePx?: number;
  },
): void => {
  const { x, y, fontWeight, maxFontSizePx, maxWidth, minFontSizePx } = options;

  context.font = resolveFontSpec(fontWeight, maxFontSizePx);

  const fittedFontSize = resolveFittedFontSize(context.measureText(text).width, {
    maxWidth,
    maxFontSizePx,
    minFontSizePx: minFontSizePx ?? BILLBOARD_MIN_FONT_SIZE_PX,
  });

  if (fittedFontSize !== maxFontSizePx) {
    context.font = resolveFontSpec(fontWeight, fittedFontSize);
  }

  context.fillText(text, x, y);
};

/** 전광판과 같은 배경·테두리·헤더 구분선. */
const drawPanelBackground = (context: CanvasRenderingContext2D): void => {
  const { width, height, paddingX } = BLOCK_DASHBOARD_TEXTURE;

  context.fillStyle = BILLBOARD_COLORS.background;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = BILLBOARD_COLORS.panelEdge;
  context.lineWidth = 4;
  context.strokeRect(2, 2, width - 4, height - 4);

  context.strokeStyle = BILLBOARD_COLORS.divider;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(paddingX, LAYOUT.headerDividerY);
  context.lineTo(width - paddingX, LAYOUT.headerDividerY);
  context.stroke();
};

/**
 * 비트코인 마크.
 *
 * 전광판과 같은 도형이다. `₿`(U+20BF) 글리프가 없는 환경에서 두부가 뜨는 것을
 * 막으려고 도형으로 그린다.
 */
const drawBitcoinMark = (context: CanvasRenderingContext2D): void => {
  const { centerX, centerY, radius } = LAYOUT.logo;

  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fillStyle = BILLBOARD_COLORS.brand;
  context.fill();

  context.save();
  context.translate(centerX, centerY);
  context.rotate(-(14 * Math.PI) / 180);
  context.fillStyle = "#ffffff";

  const strokeWidth = radius * 0.13;
  const strokeHeight = radius * 0.42;

  for (const offsetX of [-radius * 0.22, radius * 0.1]) {
    context.fillRect(offsetX, -radius * 0.78, strokeWidth, strokeHeight);
    context.fillRect(offsetX, radius * 0.36, strokeWidth, strokeHeight);
  }

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = resolveFontSpec(700, radius * 1.5);
  context.fillText("B", 0, 0);
  context.restore();
};

/** 우측 상단 채굴 상태 배지. 전광판 접속 배지와 같은 자리·같은 규격이다. */
const drawStatusBadge = (context: CanvasRenderingContext2D, isStale: boolean): void => {
  const accentColor = isStale ? BILLBOARD_COLORS.flat : BILLBOARD_COLORS.online;

  context.beginPath();
  context.roundRect(
    LAYOUT.statusBadge.x,
    LAYOUT.statusBadge.y,
    LAYOUT.statusBadge.width,
    LAYOUT.statusBadge.height,
    LAYOUT.statusBadge.radius,
  );
  context.fillStyle = BILLBOARD_COLORS.tickerSurface;
  context.fill();

  context.beginPath();
  context.arc(LAYOUT.statusDot.x, LAYOUT.statusDot.y, LAYOUT.statusDot.radius, 0, Math.PI * 2);
  context.fillStyle = accentColor;
  context.fill();

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = accentColor;
  context.font = resolveFontSpec(600, LAYOUT.statusText.fontSize);
  context.fillText(isStale ? "지연" : "채굴중", LAYOUT.statusText.x, LAYOUT.statusText.y);
};

const drawHeader = (context: CanvasRenderingContext2D, isStale: boolean): void => {
  drawBitcoinMark(context);

  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = BILLBOARD_COLORS.label;
  context.font = resolveFontSpec(800, LAYOUT.title.fontSize);
  context.fillText("BLOCK", LAYOUT.title.x, LAYOUT.title.y);

  context.beginPath();
  context.roundRect(
    LAYOUT.badge.x,
    LAYOUT.badge.y,
    LAYOUT.badge.width,
    LAYOUT.badge.height,
    LAYOUT.badge.radius,
  );
  context.fillStyle = BILLBOARD_COLORS.tickerSurface;
  context.fill();

  context.textAlign = "center";
  context.fillStyle = BILLBOARD_COLORS.tickerText;
  context.font = resolveFontSpec(600, LAYOUT.badgeText.fontSize);
  context.fillText("MAINNET", LAYOUT.badgeText.x, LAYOUT.badgeText.y);

  drawStatusBadge(context, isStale);
};

/** 전광판 가격 행과 같은 표면. 그라데이션·테두리·세로 구분선 규격이 동일하다. */
const drawRowSurface = (context: CanvasRenderingContext2D, centerY: number): void => {
  const rowTop = centerY - LAYOUT.rowPanel.height / 2;
  const gradient = context.createLinearGradient(0, rowTop, 0, rowTop + LAYOUT.rowPanel.height);
  gradient.addColorStop(0, BILLBOARD_COLORS.rowSurfaceTop);
  gradient.addColorStop(1, BILLBOARD_COLORS.rowSurfaceBottom);

  context.beginPath();
  context.roundRect(
    LAYOUT.rowPanel.x,
    rowTop,
    LAYOUT.rowPanel.width,
    LAYOUT.rowPanel.height,
    LAYOUT.rowPanel.radius,
  );
  context.fillStyle = gradient;
  context.fill();
  context.strokeStyle = BILLBOARD_COLORS.rowBorder;
  context.lineWidth = 1.5;
  context.stroke();

  context.strokeStyle = BILLBOARD_COLORS.rowDivider;
  context.lineWidth = 1;

  for (const dividerX of LAYOUT.rowPanel.dividerXs) {
    context.beginPath();
    context.moveTo(dividerX, centerY - 36);
    context.lineTo(dividerX, centerY + 36);
    context.stroke();
  }
};

/** 통화명 자리에 이름·단위 두 줄, 가격 자리에 주 값, 등락 자리에 보조 값을 둔다. */
const drawRow = (
  context: CanvasRenderingContext2D,
  options: {
    centerY: number;
    label: string;
    unit: string;
    value: string;
    asideLabel: string;
    asideValue: string;
  },
): void => {
  const { centerY, label, unit, value, asideLabel, asideValue } = options;

  drawRowSurface(context, centerY);

  context.textAlign = "left";
  context.textBaseline = "middle";

  context.fillStyle = BILLBOARD_COLORS.label;
  context.font = resolveFontSpec(700, LAYOUT.rowLabel.fontSize);
  context.fillText(label, LAYOUT.rowLabel.x, centerY + LAYOUT.rowLabel.offsetY);

  context.fillStyle = BILLBOARD_COLORS.labelMuted;
  context.font = resolveFontSpec(500, LAYOUT.rowUnit.fontSize);
  context.fillText(unit, LAYOUT.rowUnit.x, centerY + LAYOUT.rowUnit.offsetY);

  context.fillStyle = BILLBOARD_COLORS.price;
  drawFittedText(context, value, {
    x: LAYOUT.rowValue.x,
    y: centerY,
    fontWeight: 700,
    maxFontSizePx: LAYOUT.rowValue.fontSize,
    maxWidth: LAYOUT.rowValue.maxWidth,
  });

  context.fillStyle = BILLBOARD_COLORS.labelMuted;
  context.font = resolveFontSpec(500, LAYOUT.rowAsideLabel.fontSize);
  context.fillText(asideLabel, LAYOUT.rowAsideLabel.x, centerY + LAYOUT.rowAsideLabel.offsetY);

  context.fillStyle = BILLBOARD_COLORS.tickerText;
  drawFittedText(context, asideValue, {
    x: LAYOUT.rowAside.x,
    y: centerY + LAYOUT.rowAside.offsetY,
    fontWeight: 700,
    maxFontSizePx: LAYOUT.rowAside.fontSize,
    maxWidth: LAYOUT.rowAside.maxWidth,
    minFontSizePx: 28,
  });
};

/**
 * 반감기 진행 바.
 *
 * 전광판이 24시간 차트를 두는 자리라 이 판에도 한 눈에 읽히는 그림이 하나는
 * 필요하다. 숫자만 늘어놓으면 "얼마나 남았는지" 가 감으로 오지 않는다.
 */
const drawProgressBar = (context: CanvasRenderingContext2D, percent: number | null): void => {
  const { x, y, width, height, radius } = LAYOUT.progressBar;

  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = BILLBOARD_COLORS.rowSurfaceBottom;
  context.fill();
  context.strokeStyle = BILLBOARD_COLORS.rowBorder;
  context.lineWidth = 1.5;
  context.stroke();

  if (percent === null || percent <= 0) {
    return;
  }

  // 반지름보다 짧은 채움은 둥근 끝이 뭉개지므로 최소 폭을 지름으로 둔다.
  const filledWidth = Math.max(height, (width * Math.min(100, percent)) / 100);

  context.beginPath();
  context.roundRect(x, y, filledWidth, height, radius);
  context.fillStyle = BILLBOARD_COLORS.brand;
  context.fill();
};

/** 하단 반감기 지표. 전광판의 차트 영역을 격자로 쓴다. */
const drawMetricPanel = (
  context: CanvasRenderingContext2D,
  cells: readonly { label: string; value: string }[],
): void => {
  const { x, top, width, height, radius, columns } = LAYOUT.metricPanel;
  const gradient = context.createLinearGradient(0, top, 0, top + height);
  gradient.addColorStop(0, BILLBOARD_COLORS.rowSurfaceTop);
  gradient.addColorStop(1, BILLBOARD_COLORS.rowSurfaceBottom);

  context.beginPath();
  context.roundRect(x, top, width, height, radius);
  context.fillStyle = gradient;
  context.fill();
  context.strokeStyle = BILLBOARD_COLORS.rowBorder;
  context.lineWidth = 1.5;
  context.stroke();

  const rowCount = Math.ceil(cells.length / columns);
  const columnWidth = width / columns;
  const rowHeight = height / rowCount;

  context.strokeStyle = BILLBOARD_COLORS.rowDivider;
  context.lineWidth = 1;

  // 격자선은 패널 안쪽으로 36 px 들여 그린다. 모서리까지 닿으면 테두리와 겹친다.
  for (let index = 1; index < columns; index += 1) {
    const dividerX = x + columnWidth * index;

    context.beginPath();
    context.moveTo(dividerX, top + 36);
    context.lineTo(dividerX, top + height - 36);
    context.stroke();
  }

  for (let index = 1; index < rowCount; index += 1) {
    const dividerY = top + rowHeight * index;

    context.beginPath();
    context.moveTo(x + 36, dividerY);
    context.lineTo(x + width - 36, dividerY);
    context.stroke();
  }

  context.textAlign = "center";
  context.textBaseline = "middle";

  cells.forEach((cell, index) => {
    const columnCenterX = x + columnWidth * ((index % columns) + 0.5);
    const cellCenterY = top + rowHeight * (Math.floor(index / columns) + 0.5);

    context.fillStyle = BILLBOARD_COLORS.labelMuted;
    context.font = resolveFontSpec(500, LAYOUT.metricLabel.fontSize);
    context.fillText(cell.label, columnCenterX, cellCenterY + LAYOUT.metricLabel.offsetY);

    context.fillStyle = BILLBOARD_COLORS.price;
    drawFittedText(context, cell.value, {
      x: columnCenterX,
      y: cellCenterY + LAYOUT.metricValue.offsetY,
      fontWeight: 700,
      maxFontSizePx: LAYOUT.metricValue.fontSize,
      maxWidth: columnWidth - 64,
      minFontSizePx: 40,
    });
  });
};
// endregion

/**
 * 현황판 한 장을 그린다.
 *
 * 전광판이 원화·달러 두 행에 가격을 담는 자리에 **현재 블록**(높이·경과·풀·보조금)을
 * 담고, 24시간 차트가 있던 아래 영역을 **반감기**(진행 바 + 지표 3개)에 준다.
 * 수수료·멤풀·해시레이트는 뺐다 — 이 판에서 볼 것은 "지금 몇 번 블록이고 반감기가
 * 얼마나 남았는가" 다. 같은 격자를 쓰므로 두 판을 나란히 봤을 때 선이 맞는다.
 */
export const drawBlockDashboard = (
  context: CanvasRenderingContext2D,
  state: BlockDashboardState,
): void => {
  drawPanelBackground(context);
  drawHeader(context, isBlockFeedStale(state.elapsedSeconds));

  drawRow(context, {
    centerY: LAYOUT.rows.height.centerY,
    label: LAYOUT.rows.height.label,
    unit: LAYOUT.rows.height.unit,
    value: formatBlockHeight(state.height),
    asideLabel: "채굴 시각",
    asideValue: formatElapsed(state.elapsedSeconds),
  });

  drawRow(context, {
    centerY: LAYOUT.rows.pool.centerY,
    label: LAYOUT.rows.pool.label,
    unit: LAYOUT.rows.pool.unit,
    value: formatPoolName(state.poolName),
    asideLabel: "블록 보상",
    asideValue: formatSubsidy(state.subsidy),
  });

  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = BILLBOARD_COLORS.label;
  context.font = resolveFontSpec(700, LAYOUT.sectionTitle.fontSize);
  context.fillText("다음 반감기", LAYOUT.sectionTitle.x, LAYOUT.sectionTitle.y);

  context.fillStyle = BILLBOARD_COLORS.labelMuted;
  context.font = resolveFontSpec(500, LAYOUT.sectionSubtitle.fontSize);
  context.fillText(
    state.nextHalvingDate === "" ? "" : `${state.nextHalvingDate} 예상`,
    LAYOUT.sectionSubtitle.x,
    LAYOUT.sectionSubtitle.y,
  );

  context.textAlign = "right";
  context.fillStyle = BILLBOARD_COLORS.brand;
  context.font = resolveFontSpec(700, LAYOUT.progressLabel.fontSize);
  context.fillText(
    formatHalvingProgress(state.halvingProgressPercent),
    LAYOUT.progressLabel.x,
    LAYOUT.progressLabel.y,
  );

  drawProgressBar(context, state.halvingProgressPercent);

  drawMetricPanel(context, [
    { label: "남은 블록", value: formatBlocksToHalving(state.blocksToHalving) },
    { label: "예상 소요", value: formatTimeToHalving(state.blocksToHalving) },
    { label: "반감 후 보조금", value: formatSubsidy(state.nextSubsidy) },
  ]);
};
