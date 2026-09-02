import type { ConnectionStatus, VenueId } from "@/entities/order-flow";
import { VENUE_LABELS } from "@/entities/order-flow";
import {
  ORDER_WALL_LEVEL_COUNT,
  type OrderWallSnapshot,
  type VenueBadgeInfo,
} from "../model/battleRenderTypes";
import { BUY_SIDE_RGB, SELL_SIDE_RGB, toRgbaColor, VENUE_ACCENT_RGB } from "../model/warViewModel";
import { BattleEngine } from "./battleEngine";
import type { ShipSpriteAtlas } from "./shipSpriteAtlas";
import type { StarField } from "./starField";

export interface RenderSpaceBattleInput {
  context: CanvasRenderingContext2D;
  widthInPx: number;
  heightInPx: number;
  engine: BattleEngine;
  starField: StarField;
  /** 아직 받는 중이면 null. 그동안은 단순 도형으로 대신 그린다. */
  shipSpriteAtlas: ShipSpriteAtlas | null;
  orderWalls: OrderWallSnapshot[];
  venueBadges: VenueBadgeInfo[];
  isReducedMotion: boolean;
}

const BATTLE_FIELD_TOP_RATIO = 0.16;
const BATTLE_FIELD_BOTTOM_RATIO = 0.94;

/** 유닛의 `sizeInPx` 를 스프라이트 가로 폭으로 바꾸는 배수. */
const SHIP_DRAW_WIDTH_MULTIPLIER = 2.6;

/** 우주 배경색. 이 화면은 사이트 테마와 무관하게 항상 어둡다. */
const DEEP_SPACE_RGB = "8 10 18";
const NEBULA_CORE_RGB = "30 41 59";

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connecting: "CONNECTING",
  syncing: "SYNCING",
  live: "LIVE",
  stale: "STALE",
  error: "ERROR",
};

/**
 * 우주 배경.
 *
 * 성운은 진영색을 양 끝에 아주 옅게 깔아 좌우가 누구 영역인지 색으로 먼저 알린다.
 * 별필드는 이 위에 얹는다.
 */
function drawSpaceBackground(input: RenderSpaceBattleInput): void {
  const { context, widthInPx, heightInPx, starField } = input;

  context.fillStyle = toRgbaColor(DEEP_SPACE_RGB, 1);
  context.fillRect(0, 0, widthInPx, heightInPx);

  const nebulaGradient = context.createLinearGradient(0, 0, widthInPx, 0);
  nebulaGradient.addColorStop(0, toRgbaColor(BUY_SIDE_RGB, 0.14));
  nebulaGradient.addColorStop(0.5, toRgbaColor(NEBULA_CORE_RGB, 0.35));
  nebulaGradient.addColorStop(1, toRgbaColor(SELL_SIDE_RGB, 0.14));

  context.fillStyle = nebulaGradient;
  context.fillRect(0, 0, widthInPx, heightInPx);

  starField.draw(context);
}

/**
 * 호가벽을 에너지 실드로 그린다.
 *
 * 계단식 막대라는 자료 구조는 그대로다. 두께와 발광만 우주 쪽으로 옮겼고, 연결이 나쁜
 * 거래소의 실드는 흐리게 떨어뜨려 신뢰도가 낮다는 것을 그대로 보여 준다.
 */
function drawEnergyShields(input: RenderSpaceBattleInput): void {
  const { context, widthInPx, heightInPx, engine, orderWalls } = input;

  if (orderWalls.length === 0) {
    return;
  }

  const frontLineXInPx = engine.getFrontLineRatio() * widthInPx;
  const fieldTopInPx = heightInPx * BATTLE_FIELD_TOP_RATIO;
  const fieldHeightInPx = heightInPx * BATTLE_FIELD_BOTTOM_RATIO - fieldTopInPx;
  const laneHeightInPx = fieldHeightInPx / orderWalls.length;
  const maxShieldLengthInPx = Math.max(24, widthInPx * 0.28);

  orderWalls.forEach((wall, wallIndex) => {
    if (wall.maxSizeInBtc <= 0) {
      return;
    }

    const laneTopInPx = fieldTopInPx + laneHeightInPx * wallIndex;
    const barHeightInPx = Math.max(1.5, (laneHeightInPx / ORDER_WALL_LEVEL_COUNT) * 0.58);
    const barGapInPx = laneHeightInPx / ORDER_WALL_LEVEL_COUNT;
    const shieldAlpha = wall.isWeakened ? 0.14 : 0.5;

    for (let levelIndex = 0; levelIndex < ORDER_WALL_LEVEL_COUNT; levelIndex += 1) {
      const barYInPx = laneTopInPx + barGapInPx * levelIndex + barGapInPx * 0.2;
      const bidLevel = wall.bidLevels[levelIndex];
      const askLevel = wall.askLevels[levelIndex];

      if (bidLevel !== undefined) {
        const barLengthInPx = (bidLevel.sizeInBtc / wall.maxSizeInBtc) * maxShieldLengthInPx;
        context.fillStyle = toRgbaColor(BUY_SIDE_RGB, shieldAlpha);
        context.fillRect(
          frontLineXInPx - 8 - barLengthInPx,
          barYInPx,
          barLengthInPx,
          barHeightInPx,
        );
      }

      if (askLevel !== undefined) {
        const barLengthInPx = (askLevel.sizeInBtc / wall.maxSizeInBtc) * maxShieldLengthInPx;
        context.fillStyle = toRgbaColor(SELL_SIDE_RGB, shieldAlpha);
        context.fillRect(frontLineXInPx + 8, barYInPx, barLengthInPx, barHeightInPx);
      }
    }

    context.fillStyle = toRgbaColor(VENUE_ACCENT_RGB[wall.venue], wall.isWeakened ? 0.25 : 0.9);
    context.fillRect(2, laneTopInPx + 2, 3, laneHeightInPx - 6);
  });
}

/** 전선. 두 세력이 맞닿은 우주 경계선으로 그린다. */
function drawFrontLine(input: RenderSpaceBattleInput): void {
  const { context, widthInPx, heightInPx, engine } = input;

  const frontLineXInPx = engine.getFrontLineRatio() * widthInPx;
  const fieldTopInPx = heightInPx * BATTLE_FIELD_TOP_RATIO;
  const fieldBottomInPx = heightInPx * BATTLE_FIELD_BOTTOM_RATIO;

  const glowGradient = context.createLinearGradient(frontLineXInPx - 22, 0, frontLineXInPx + 22, 0);
  glowGradient.addColorStop(0, toRgbaColor(BUY_SIDE_RGB, 0));
  glowGradient.addColorStop(0.5, toRgbaColor("226 232 240", 0.3));
  glowGradient.addColorStop(1, toRgbaColor(SELL_SIDE_RGB, 0));

  context.fillStyle = glowGradient;
  context.fillRect(frontLineXInPx - 22, fieldTopInPx, 44, fieldBottomInPx - fieldTopInPx);

  context.strokeStyle = toRgbaColor("248 250 252", 0.8);
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(frontLineXInPx, fieldTopInPx);
  context.lineTo(frontLineXInPx, fieldBottomInPx);
  context.stroke();
}

/**
 * 엔진 배기.
 *
 * 기수 방향 반대편에 거래소 보조색으로 짧게 흘린다. 스프라이트에는 진영색만 구워져
 * 있어서 어느 거래소 체결인지는 이 불꽃이 혼자 감당한다.
 */
function drawEngineTrail(
  context: CanvasRenderingContext2D,
  venue: VenueId,
  isBuySide: boolean,
  centerXInPx: number,
  centerYInPx: number,
  shipWidthInPx: number,
  trailAlpha: number,
): void {
  const trailDirection = isBuySide ? -1 : 1;
  const trailRootXInPx = centerXInPx + trailDirection * shipWidthInPx * 0.42;
  const trailLengthInPx = shipWidthInPx * 0.5;
  const trailThicknessInPx = Math.max(1, shipWidthInPx * 0.12);

  context.fillStyle = toRgbaColor(VENUE_ACCENT_RGB[venue], trailAlpha * 0.85);
  context.fillRect(
    trailDirection === 1 ? trailRootXInPx : trailRootXInPx - trailLengthInPx * 0.45,
    centerYInPx - trailThicknessInPx / 2,
    trailLengthInPx * 0.45,
    trailThicknessInPx,
  );

  context.fillStyle = toRgbaColor(VENUE_ACCENT_RGB[venue], trailAlpha * 0.3);
  context.fillRect(
    trailDirection === 1 ? trailRootXInPx : trailRootXInPx - trailLengthInPx,
    centerYInPx - trailThicknessInPx / 4,
    trailLengthInPx,
    trailThicknessInPx / 2,
  );
}

/** 아틀라스가 아직 없을 때 자리를 채우는 쐐기. 로딩 중에 화면이 비지 않게 한다. */
function drawFallbackWedge(
  context: CanvasRenderingContext2D,
  isBuySide: boolean,
  centerXInPx: number,
  centerYInPx: number,
  sizeInPx: number,
): void {
  const noseDirection = isBuySide ? 1 : -1;

  context.beginPath();
  context.moveTo(centerXInPx + noseDirection * sizeInPx, centerYInPx);
  context.lineTo(centerXInPx - noseDirection * sizeInPx * 0.7, centerYInPx - sizeInPx * 0.62);
  context.lineTo(centerXInPx - noseDirection * sizeInPx * 0.25, centerYInPx);
  context.lineTo(centerXInPx - noseDirection * sizeInPx * 0.7, centerYInPx + sizeInPx * 0.62);
  context.closePath();
  context.fill();
}

/**
 * 함선.
 *
 * 스프라이트에 방향이 이미 구워져 있어 회전이 필요 없다. 유닛마다 `save`/`restore` 를
 * 부르지 않는 것이 수백 대를 그릴 때 가장 크게 아끼는 부분이다.
 */
function drawShips(input: RenderSpaceBattleInput): void {
  const { context, widthInPx, heightInPx, engine, shipSpriteAtlas, isReducedMotion } = input;

  engine.unitPool.forEachActive((unit) => {
    const wobbleOffsetInPx = isReducedMotion
      ? 0
      : Math.sin(unit.wobblePhase + unit.ageInMs / 220) * 2.2;
    const centerXInPx = unit.positionXRatio * widthInPx;
    const centerYInPx = unit.positionYRatio * heightInPx + wobbleOffsetInPx;
    const isBuySide = unit.side === "buy";
    const bodyAlpha = unit.isWeakened ? 0.3 : 1;

    if (shipSpriteAtlas === null) {
      context.globalAlpha = bodyAlpha;
      context.fillStyle = toRgbaColor(isBuySide ? BUY_SIDE_RGB : SELL_SIDE_RGB, 0.92);
      drawFallbackWedge(context, isBuySide, centerXInPx, centerYInPx, unit.sizeInPx);
      context.globalAlpha = 1;
      return;
    }

    const sprite = shipSpriteAtlas.getSprite(unit.magnitude, unit.side);
    const drawWidthInPx = unit.sizeInPx * SHIP_DRAW_WIDTH_MULTIPLIER;
    const drawHeightInPx = drawWidthInPx * sprite.heightPerWidthRatio;

    context.globalAlpha = bodyAlpha;

    drawEngineTrail(
      context,
      unit.venue,
      isBuySide,
      centerXInPx,
      centerYInPx,
      drawWidthInPx,
      bodyAlpha,
    );

    context.drawImage(
      sprite.source,
      sprite.sourceXInPx,
      sprite.sourceYInPx,
      sprite.sourceWidthInPx,
      sprite.sourceHeightInPx,
      centerXInPx - drawWidthInPx / 2,
      centerYInPx - drawHeightInPx / 2,
      drawWidthInPx,
      drawHeightInPx,
    );

    context.globalAlpha = 1;
  });
}

/** 투사체. 진영 색 예광탄이 전선을 향해 날아간다. */
function drawProjectiles(input: RenderSpaceBattleInput): void {
  const { context, widthInPx, heightInPx, engine } = input;

  engine.projectilePool.forEachActive((projectile) => {
    const positionXInPx = projectile.positionXRatio * widthInPx;
    const positionYInPx = projectile.positionYRatio * heightInPx;
    const sideRgb = projectile.side === "buy" ? BUY_SIDE_RGB : SELL_SIDE_RGB;
    const trailLengthInPx = projectile.side === "buy" ? -14 : 14;

    context.strokeStyle = toRgbaColor(sideRgb, projectile.isWeakened ? 0.18 : 0.5);
    context.lineWidth = projectile.radiusInPx * 0.9;
    context.beginPath();
    context.moveTo(positionXInPx + trailLengthInPx, positionYInPx);
    context.lineTo(positionXInPx, positionYInPx);
    context.stroke();

    context.fillStyle = toRgbaColor("248 250 252", projectile.isWeakened ? 0.35 : 1);
    context.beginPath();
    context.arc(positionXInPx, positionYInPx, projectile.radiusInPx * 0.7, 0, Math.PI * 2);
    context.fill();
  });
}

/** 폭발. 충격파 고리가 퍼지면서 옅어진다. */
function drawExplosions(input: RenderSpaceBattleInput): void {
  const { context, widthInPx, heightInPx, engine } = input;

  engine.explosionPool.forEachActive((explosion) => {
    const explosionProgress = BattleEngine.getExplosionProgress(explosion);
    const positionXInPx = explosion.positionXRatio * widthInPx;
    const positionYInPx = explosion.positionYRatio * heightInPx;
    const radiusInPx = explosion.maxRadiusInPx * (0.35 + explosionProgress * 0.65);
    const explosionAlpha = (1 - explosionProgress) * (explosion.isWeakened ? 0.25 : 0.9);
    const sideRgb = explosion.side === "buy" ? BUY_SIDE_RGB : SELL_SIDE_RGB;

    context.strokeStyle = toRgbaColor(sideRgb, explosionAlpha);
    context.lineWidth = 2;
    context.beginPath();
    context.arc(positionXInPx, positionYInPx, radiusInPx, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = toRgbaColor("254 249 195", explosionAlpha * 0.5);
    context.beginPath();
    context.arc(positionXInPx, positionYInPx, radiusInPx * 0.35, 0, Math.PI * 2);
    context.fill();
  });
}

/** 상단 거래소 배지. 연결이 나쁜 거래소는 상태 문구를 그대로 띄운다. */
function drawVenueBadges(input: RenderSpaceBattleInput): void {
  const { context, venueBadges } = input;

  context.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.textBaseline = "middle";

  let badgeLeftInPx = 10;

  for (const badge of venueBadges) {
    const badgeText = `${VENUE_LABELS[badge.venue].name.toUpperCase()} ${STATUS_LABELS[badge.status]}`;
    const badgeWidthInPx = context.measureText(badgeText).width + 18;
    const isDimmed = badge.status !== "live";

    context.fillStyle = toRgbaColor("255 255 255", 0.07);
    context.fillRect(badgeLeftInPx, 8, badgeWidthInPx, 18);

    context.fillStyle = toRgbaColor(VENUE_ACCENT_RGB[badge.venue], isDimmed ? 0.35 : 1);
    context.beginPath();
    context.arc(badgeLeftInPx + 7, 17, 3, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = toRgbaColor("226 232 240", isDimmed ? 0.55 : 0.95);
    context.fillText(badgeText, badgeLeftInPx + 14, 17.5);

    badgeLeftInPx += badgeWidthInPx + 6;
  }
}

/**
 * 한 프레임을 그린다.
 *
 * 별필드는 흔들림 바깥에 둔다. 대형 체결로 화면이 흔들릴 때 배경까지 같이 떨면
 * 카메라가 흔들리는 게 아니라 우주가 흔들리는 것처럼 보인다.
 */
export function renderSpaceBattle(input: RenderSpaceBattleInput): void {
  const { context, engine, isReducedMotion } = input;

  const shakeIntensityInPx = isReducedMotion ? 0 : engine.getShakeIntensityInPx();
  const shakeOffsetXInPx = (Math.random() - 0.5) * shakeIntensityInPx;
  const shakeOffsetYInPx = (Math.random() - 0.5) * shakeIntensityInPx;

  drawSpaceBackground(input);

  context.save();
  context.translate(shakeOffsetXInPx, shakeOffsetYInPx);

  drawEnergyShields(input);
  drawFrontLine(input);
  drawShips(input);
  drawProjectiles(input);
  drawExplosions(input);

  context.restore();

  drawVenueBadges(input);
}
