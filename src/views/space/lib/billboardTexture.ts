import { BITCOIN_COLOR } from "@/shared/config/color";

/**
 * 전광판 캔버스 텍스처.
 *
 * 숫자는 `drei` 의 SDF 텍스트가 아니라 캔버스로 그린다. 폰트 아틀라스를 추가로
 * 받지 않고 LED 그릴 질감을 셰이더 없이 낼 수 있다. 근거는
 * `docs/btc-space-3d.md` §6 에 있다.
 */

export const BILLBOARD_TEXTURE = {
  width: 1024,
  height: 512,
  /** 텍스처 재업로드 간격 상한. 시세는 초당 수십 번 바뀐다. */
  minRedrawIntervalMs: 250,
  /** LED 그릴 간격(px). */
  gridPitch: 6,
} as const;

export const BILLBOARD_COLORS = {
  background: "#06080e",
  panelEdge: "#1b2432",
  grid: "#020306",
  label: "#7c8699",
  price: BITCOIN_COLOR,
  subPrice: "#e4e9f2",
  up: "#22c55e",
  down: "#ef4444",
  flat: "#7c8699",
  offline: "#ef4444",
  online: "#22c55e",
} as const;

/** 값이 아직 없을 때 표시할 자리. 스토어는 0 으로 시작한다. */
export const BILLBOARD_PLACEHOLDER = "—";

export type BillboardTone = "up" | "down" | "flat";

export interface BillboardState {
  krw: number;
  usd: number;
  krwChange24h: string;
  usdChange24h: string;
  isKrwConnected: boolean;
  isUsdConnected: boolean;
}

const KRW_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const USD_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

// region [Privates]
/** 시세는 스토어 초기값이 0 이므로 0 과 비유한 값을 모두 미표시로 본다. */
const isDisplayablePrice = (price: number): boolean => {
  return Number.isFinite(price) && price > 0;
};

const parseChange = (change: string | number): number | null => {
  const parsed = typeof change === "number" ? change : Number.parseFloat(change);
  return Number.isFinite(parsed) ? parsed : null;
};
// endregion

export const formatBillboardKrw = (price: number): string => {
  return isDisplayablePrice(price) ? `₩${KRW_FORMATTER.format(price)}` : BILLBOARD_PLACEHOLDER;
};

export const formatBillboardUsd = (price: number): string => {
  return isDisplayablePrice(price) ? `$${USD_FORMATTER.format(price)}` : BILLBOARD_PLACEHOLDER;
};

/** 소수 두 자리로 고정한다. 자리수가 흔들리면 4 Hz 갱신 때 글자가 떤다. */
export const formatBillboardChange = (change: string | number): string => {
  const parsed = parseChange(change);

  if (parsed === null) {
    return BILLBOARD_PLACEHOLDER;
  }
  if (parsed === 0) {
    return "0.00%";
  }

  return `${parsed > 0 ? "+" : "-"}${Math.abs(parsed).toFixed(2)}%`;
};

export const resolveChangeTone = (change: string | number): BillboardTone => {
  const parsed = parseChange(change);

  if (parsed === null || parsed === 0) {
    return "flat";
  }

  return parsed > 0 ? "up" : "down";
};

export const resolveToneColor = (tone: BillboardTone): string => {
  return BILLBOARD_COLORS[tone];
};

// region [Privates]
const drawPanelBackground = (context: CanvasRenderingContext2D): void => {
  const { width, height } = BILLBOARD_TEXTURE;

  context.fillStyle = BILLBOARD_COLORS.background;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = BILLBOARD_COLORS.panelEdge;
  context.lineWidth = 4;
  context.strokeRect(2, 2, width - 4, height - 4);
};

/** 글자 위에 어두운 격자를 덮어 LED 그릴처럼 보이게 한다. */
const drawLedGrid = (context: CanvasRenderingContext2D): void => {
  const { width, height, gridPitch } = BILLBOARD_TEXTURE;

  context.fillStyle = BILLBOARD_COLORS.grid;

  for (let x = 0; x < width; x += gridPitch) {
    context.fillRect(x, 0, 2, height);
  }
  for (let y = 0; y < height; y += gridPitch) {
    context.fillRect(0, y, width, 2);
  }
};

const drawConnectionDot = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  isConnected: boolean,
): void => {
  context.beginPath();
  context.arc(x, y, 9, 0, Math.PI * 2);
  context.fillStyle = isConnected ? BILLBOARD_COLORS.online : BILLBOARD_COLORS.offline;
  context.fill();
};
// endregion

/**
 * 전광판 한 장을 그린다.
 *
 * 숫자는 가변폭 폰트에서 자리수마다 폭이 달라지므로 등폭 스택을 쓴다.
 */
export const drawBillboard = (context: CanvasRenderingContext2D, state: BillboardState): void => {
  const { width } = BILLBOARD_TEXTURE;
  const centerX = width / 2;

  drawPanelBackground(context);
  context.textAlign = "center";
  context.textBaseline = "middle";

  context.font = "600 40px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillStyle = BILLBOARD_COLORS.label;
  context.fillText("BITCOIN / KRW", centerX, 74);

  // 가격 숫자 높이 168 px. 패널 폭 12 m 기준으로 32 m 거리에서 읽히는 하한이다.
  context.font = "700 168px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillStyle = BILLBOARD_COLORS.price;
  context.fillText(formatBillboardKrw(state.krw), centerX, 214);

  context.font = "600 84px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillStyle = BILLBOARD_COLORS.subPrice;
  context.fillText(formatBillboardUsd(state.usd), centerX, 348);

  context.font = "700 76px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillStyle = resolveToneColor(resolveChangeTone(state.krwChange24h));
  context.fillText(`24H ${formatBillboardChange(state.krwChange24h)}`, centerX, 444);

  drawConnectionDot(context, 44, 74, state.isKrwConnected);
  drawConnectionDot(context, width - 44, 74, state.isUsdConnected);

  drawLedGrid(context);
};
