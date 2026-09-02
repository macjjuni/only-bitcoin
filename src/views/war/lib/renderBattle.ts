import type { ConnectionStatus, OrderBookLevel, VenueId } from "@/entities/order-flow";
import { VENUE_LABELS } from "@/entities/order-flow";
import { BUY_SIDE_RGB, SELL_SIDE_RGB, toRgbaColor, VENUE_ACCENT_RGB } from "../model/warViewModel";
import { BattleEngine } from "./battleEngine";

/** 방어벽으로 그릴 호가 단계 수. */
export const ORDER_WALL_LEVEL_COUNT = 14;

/** 거래소 하나의 방어벽 자료. 가격은 통화가 달라 쓰지 않고 BTC 수량 비율만 쓴다. */
export interface OrderWallSnapshot {
  venue: VenueId;
  bidLevels: OrderBookLevel[];
  askLevels: OrderBookLevel[];
  /** 이 거래소 안에서의 최대 호가 수량. 막대 길이를 자기 기준으로 정규화한다. */
  maxSizeInBtc: number;
  isWeakened: boolean;
}

export interface VenueBadgeInfo {
  venue: VenueId;
  status: ConnectionStatus;
  isIncludedInAggregate: boolean;
}

export interface RenderBattleInput {
  context: CanvasRenderingContext2D;
  widthInPx: number;
  heightInPx: number;
  engine: BattleEngine;
  orderWalls: OrderWallSnapshot[];
  venueBadges: VenueBadgeInfo[];
  isDarkTheme: boolean;
  isReducedMotion: boolean;
}

const BATTLE_FIELD_TOP_RATIO = 0.16;
const BATTLE_FIELD_BOTTOM_RATIO = 0.94;

/** 상태 배지에 쓰는 짧은 표기. */
const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connecting: "CONNECTING",
  syncing: "SYNCING",
  live: "LIVE",
  stale: "STALE",
  error: "ERROR",
};

/** 배경. 왼쪽은 매수, 오른쪽은 매도 진영임을 색으로 먼저 알린다. */
function drawBackground(input: RenderBattleInput): void {
  const { context, widthInPx, heightInPx, isDarkTheme } = input;

  context.clearRect(0, 0, widthInPx, heightInPx);

  const groundGradient = context.createLinearGradient(0, 0, widthInPx, 0);
  const baseAlpha = isDarkTheme ? 0.16 : 0.1;
  groundGradient.addColorStop(0, toRgbaColor(BUY_SIDE_RGB, baseAlpha));
  groundGradient.addColorStop(0.5, toRgbaColor(isDarkTheme ? "24 24 27" : "244 244 245", 0.25));
  groundGradient.addColorStop(1, toRgbaColor(SELL_SIDE_RGB, baseAlpha));

  context.fillStyle = groundGradient;
  context.fillRect(0, 0, widthInPx, heightInPx);

  // 전장 바닥선. 유닛이 떠 있는 것처럼 보이지 않게 기준면을 준다.
  context.strokeStyle = toRgbaColor(isDarkTheme ? "255 255 255" : "0 0 0", 0.08);
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, heightInPx * BATTLE_FIELD_BOTTOM_RATIO);
  context.lineTo(widthInPx, heightInPx * BATTLE_FIELD_BOTTOM_RATIO);
  context.stroke();
}

/**
 * 호가벽.
 *
 * 각 진영 안쪽에 계단식 막대로 쌓는다. 길이는 그 거래소 자체 최대 수량 기준이라
 * 통화가 다른 거래소끼리도 비교 가능한 형태가 된다.
 */
function drawOrderWalls(input: RenderBattleInput): void {
  const { context, widthInPx, heightInPx, engine, orderWalls } = input;

  if (orderWalls.length === 0) {
    return;
  }

  const frontLineXInPx = engine.getFrontLineRatio() * widthInPx;
  const fieldTopInPx = heightInPx * BATTLE_FIELD_TOP_RATIO;
  const fieldHeightInPx = heightInPx * BATTLE_FIELD_BOTTOM_RATIO - fieldTopInPx;
  const laneHeightInPx = fieldHeightInPx / orderWalls.length;
  const maxWallLengthInPx = Math.max(24, widthInPx * 0.28);

  orderWalls.forEach((wall, wallIndex) => {
    if (wall.maxSizeInBtc <= 0) {
      return;
    }

    const laneTopInPx = fieldTopInPx + laneHeightInPx * wallIndex;
    const barHeightInPx = Math.max(1.5, (laneHeightInPx / ORDER_WALL_LEVEL_COUNT) * 0.62);
    const barGapInPx = laneHeightInPx / ORDER_WALL_LEVEL_COUNT;
    const wallAlpha = wall.isWeakened ? 0.16 : 0.42;

    for (let levelIndex = 0; levelIndex < ORDER_WALL_LEVEL_COUNT; levelIndex += 1) {
      const barYInPx = laneTopInPx + barGapInPx * levelIndex + barGapInPx * 0.2;
      const bidLevel = wall.bidLevels[levelIndex];
      const askLevel = wall.askLevels[levelIndex];

      if (bidLevel !== undefined) {
        const barLengthInPx = (bidLevel.sizeInBtc / wall.maxSizeInBtc) * maxWallLengthInPx;
        context.fillStyle = toRgbaColor(BUY_SIDE_RGB, wallAlpha);
        context.fillRect(
          frontLineXInPx - 6 - barLengthInPx,
          barYInPx,
          barLengthInPx,
          barHeightInPx,
        );
      }

      if (askLevel !== undefined) {
        const barLengthInPx = (askLevel.sizeInBtc / wall.maxSizeInBtc) * maxWallLengthInPx;
        context.fillStyle = toRgbaColor(SELL_SIDE_RGB, wallAlpha);
        context.fillRect(frontLineXInPx + 6, barYInPx, barLengthInPx, barHeightInPx);
      }
    }

    // 어느 거래소의 벽인지 레인 왼쪽 끝에 보조 색으로 표시한다.
    context.fillStyle = toRgbaColor(VENUE_ACCENT_RGB[wall.venue], wall.isWeakened ? 0.25 : 0.9);
    context.fillRect(2, laneTopInPx + 2, 3, laneHeightInPx - 6);
  });
}

/** 전선. 매수가 이기면 오른쪽, 매도가 이기면 왼쪽으로 밀린다. */
function drawFrontLine(input: RenderBattleInput): void {
  const { context, widthInPx, heightInPx, engine, isDarkTheme } = input;

  const frontLineXInPx = engine.getFrontLineRatio() * widthInPx;
  const fieldTopInPx = heightInPx * BATTLE_FIELD_TOP_RATIO;
  const fieldBottomInPx = heightInPx * BATTLE_FIELD_BOTTOM_RATIO;

  const glowGradient = context.createLinearGradient(frontLineXInPx - 18, 0, frontLineXInPx + 18, 0);
  glowGradient.addColorStop(0, toRgbaColor(BUY_SIDE_RGB, 0));
  glowGradient.addColorStop(0.5, toRgbaColor(isDarkTheme ? "255 255 255" : "24 24 27", 0.22));
  glowGradient.addColorStop(1, toRgbaColor(SELL_SIDE_RGB, 0));

  context.fillStyle = glowGradient;
  context.fillRect(frontLineXInPx - 18, fieldTopInPx, 36, fieldBottomInPx - fieldTopInPx);

  context.strokeStyle = toRgbaColor(isDarkTheme ? "250 250 250" : "24 24 27", 0.7);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(frontLineXInPx, fieldTopInPx);
  context.lineTo(frontLineXInPx, fieldBottomInPx);
  context.stroke();
}

/**
 * 유닛.
 *
 * 색만으로 진영을 구분하지 않는다. 매수는 오른쪽을 향한 쐐기이고 왼쪽에서 오른쪽으로,
 * 매도는 왼쪽을 향한 각진 블록이고 오른쪽에서 왼쪽으로 움직인다.
 */
function drawUnits(input: RenderBattleInput): void {
  const { context, widthInPx, heightInPx, engine, isReducedMotion } = input;

  engine.unitPool.forEachActive((unit) => {
    const wobbleOffsetInPx = isReducedMotion
      ? 0
      : Math.sin(unit.wobblePhase + unit.ageInMs / 220) * 2.2;
    const positionXInPx = unit.positionXRatio * widthInPx;
    const positionYInPx = unit.positionYRatio * heightInPx + wobbleOffsetInPx;
    const unitSizeInPx = unit.sizeInPx;
    const sideRgb = unit.side === "buy" ? BUY_SIDE_RGB : SELL_SIDE_RGB;
    const bodyAlpha = unit.isWeakened ? 0.28 : 0.92;

    context.fillStyle = toRgbaColor(sideRgb, bodyAlpha);
    context.beginPath();

    if (unit.side === "buy") {
      context.moveTo(positionXInPx + unitSizeInPx, positionYInPx);
      context.lineTo(positionXInPx - unitSizeInPx * 0.7, positionYInPx - unitSizeInPx * 0.62);
      context.lineTo(positionXInPx - unitSizeInPx * 0.25, positionYInPx);
      context.lineTo(positionXInPx - unitSizeInPx * 0.7, positionYInPx + unitSizeInPx * 0.62);
    } else {
      context.moveTo(positionXInPx - unitSizeInPx, positionYInPx);
      context.lineTo(positionXInPx + unitSizeInPx * 0.55, positionYInPx - unitSizeInPx * 0.7);
      context.lineTo(positionXInPx + unitSizeInPx * 0.9, positionYInPx);
      context.lineTo(positionXInPx + unitSizeInPx * 0.55, positionYInPx + unitSizeInPx * 0.7);
    }

    context.closePath();
    context.fill();

    // 거래소 식별용 테두리. 큰 유닛에만 그려 작은 보병이 뭉개지지 않게 한다.
    if (unit.magnitude !== "small") {
      context.strokeStyle = toRgbaColor(VENUE_ACCENT_RGB[unit.venue], unit.isWeakened ? 0.3 : 1);
      context.lineWidth = 1.4;
      context.stroke();
    }
  });
}

/** 투사체. 진영 색 점이 전선을 향해 날아간다. */
function drawProjectiles(input: RenderBattleInput): void {
  const { context, widthInPx, heightInPx, engine } = input;

  engine.projectilePool.forEachActive((projectile) => {
    const positionXInPx = projectile.positionXRatio * widthInPx;
    const positionYInPx = projectile.positionYRatio * heightInPx;
    const sideRgb = projectile.side === "buy" ? BUY_SIDE_RGB : SELL_SIDE_RGB;
    const trailLengthInPx = projectile.side === "buy" ? -10 : 10;

    context.strokeStyle = toRgbaColor(sideRgb, projectile.isWeakened ? 0.2 : 0.55);
    context.lineWidth = projectile.radiusInPx * 0.9;
    context.beginPath();
    context.moveTo(positionXInPx + trailLengthInPx, positionYInPx);
    context.lineTo(positionXInPx, positionYInPx);
    context.stroke();

    context.fillStyle = toRgbaColor(sideRgb, projectile.isWeakened ? 0.35 : 1);
    context.beginPath();
    context.arc(positionXInPx, positionYInPx, projectile.radiusInPx, 0, Math.PI * 2);
    context.fill();
  });
}

/** 폭발. 시간이 지날수록 커지며 옅어진다. */
function drawExplosions(input: RenderBattleInput): void {
  const { context, widthInPx, heightInPx, engine } = input;

  engine.explosionPool.forEachActive((explosion) => {
    const explosionProgress = BattleEngine.getExplosionProgress(explosion);
    const positionXInPx = explosion.positionXRatio * widthInPx;
    const positionYInPx = explosion.positionYRatio * heightInPx;
    const radiusInPx = explosion.maxRadiusInPx * (0.35 + explosionProgress * 0.65);
    const explosionAlpha = (1 - explosionProgress) * (explosion.isWeakened ? 0.25 : 0.8);
    const sideRgb = explosion.side === "buy" ? BUY_SIDE_RGB : SELL_SIDE_RGB;

    context.strokeStyle = toRgbaColor(sideRgb, explosionAlpha);
    context.lineWidth = 2;
    context.beginPath();
    context.arc(positionXInPx, positionYInPx, radiusInPx, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = toRgbaColor(VENUE_ACCENT_RGB[explosion.venue], explosionAlpha * 0.35);
    context.beginPath();
    context.arc(positionXInPx, positionYInPx, radiusInPx * 0.45, 0, Math.PI * 2);
    context.fill();
  });
}

/** 상단 거래소 배지. 연결이 나쁜 거래소는 상태 문구를 그대로 띄운다. */
function drawVenueBadges(input: RenderBattleInput): void {
  const { context, venueBadges, isDarkTheme } = input;

  context.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.textBaseline = "middle";

  let badgeLeftInPx = 10;

  for (const badge of venueBadges) {
    const badgeText = `${VENUE_LABELS[badge.venue].name.toUpperCase()} ${STATUS_LABELS[badge.status]}`;
    const badgeWidthInPx = context.measureText(badgeText).width + 18;
    const isDimmed = badge.status !== "live";

    context.fillStyle = toRgbaColor(isDarkTheme ? "255 255 255" : "0 0 0", 0.06);
    context.fillRect(badgeLeftInPx, 8, badgeWidthInPx, 18);

    context.fillStyle = toRgbaColor(VENUE_ACCENT_RGB[badge.venue], isDimmed ? 0.35 : 1);
    context.beginPath();
    context.arc(badgeLeftInPx + 7, 17, 3, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = toRgbaColor(
      isDarkTheme ? "228 228 231" : "39 39 42",
      isDimmed ? 0.55 : 0.95,
    );
    context.fillText(badgeText, badgeLeftInPx + 14, 17.5);

    badgeLeftInPx += badgeWidthInPx + 6;
  }
}

/**
 * 한 프레임을 그린다.
 *
 * 외부 이미지를 쓰지 않고 캔버스 도형만 쓴다. 흔들림은 컨텍스트 이동으로 처리하고
 * 움직임 최소화 설정에서는 아예 적용하지 않는다.
 */
export function renderBattle(input: RenderBattleInput): void {
  const { context, engine, isReducedMotion } = input;

  const shakeIntensityInPx = isReducedMotion ? 0 : engine.getShakeIntensityInPx();
  const shakeOffsetXInPx = (Math.random() - 0.5) * shakeIntensityInPx;
  const shakeOffsetYInPx = (Math.random() - 0.5) * shakeIntensityInPx;

  drawBackground(input);

  context.save();
  context.translate(shakeOffsetXInPx, shakeOffsetYInPx);

  drawOrderWalls(input);
  drawFrontLine(input);
  drawUnits(input);
  drawProjectiles(input);
  drawExplosions(input);

  context.restore();

  drawVenueBadges(input);
}
