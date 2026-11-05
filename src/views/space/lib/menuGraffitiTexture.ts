import { BITCOIN_COLOR } from "@/shared/config/color";

/**
 * 커피 바 메뉴판 자리의 분필 낙서.
 *
 * 메뉴판(6 × 2.5 m)을 칠판으로 보고 "Not your keys, not your bitcoin" 을 손글씨로
 * 휘갈김. 내용이 바뀌지 않아서 한 번만 그리고 다시 올리지 않음.
 */

/** 텍스처 규격. 메뉴판과 같은 12:5 임. */
export const MENU_GRAFFITI_TEXTURE = {
  width: 1500,
  height: 625,
} as const;

export const MENU_GRAFFITI_LINES = ["Not your keys,", "not your bitcoin"] as const;

/** 주황으로 칠하는 낱말. 둘째 줄 끝에 있음. */
export const MENU_GRAFFITI_HIGHLIGHT = "bitcoin";

const COLORS = {
  boardTop: "#1f2722",
  boardBottom: "#151b17",
  smudge: "rgba(235, 232, 220, 0.05)",
  chalk: "#f1ede2",
  highlight: BITCOIN_COLOR,
} as const;

/**
 * 손글씨 글꼴. 기기마다 깔린 손글씨체를 앞에서부터 고름.
 *
 * 윈도우는 Segoe Print, 맥·iOS 는 Chalkboard SE 가 있음. 둘 다 없는 안드로이드는
 * 기본 글꼴로 떨어지지만, 분필 번짐과 기울기가 손글씨 느낌을 대신 냄.
 */
const HANDWRITING_FONT_STACK =
  '"Segoe Print", "Chalkboard SE", "Bradley Hand", "Marker Felt", "Comic Sans MS", cursive';

const LAYOUT = {
  /** 칠판 낙서는 반듯하지 않음. 살짝 오른쪽 위로 들림. */
  rotationRadians: (-3.5 * Math.PI) / 180,
  firstLine: { x: 150, y: 250, fontSize: 132 },
  secondLine: { x: 210, y: 420, fontSize: 132 },
  /** 첫 줄이 오른쪽 위 동그라미 B 와 겹치지 않는 폭. */
  maxLineWidth: 1050,
  underlineOffsetY: 62,
  coin: { x: 1300, y: 150, radius: 74 },
} as const;

// region [Privates]
/**
 * 시드 고정 난수. 번짐·가루 위치가 매번 같아야 테스트와 화면이 흔들리지 않음.
 */
const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const resolveFont = (fontSizePx: number): string => {
  return `700 ${fontSizePx}px ${HANDWRITING_FONT_STACK}`;
};

/** 칠판 바탕과 지우다 만 분필 자국. */
const drawBoard = (context: CanvasRenderingContext2D, random: () => number): void => {
  const { width, height } = MENU_GRAFFITI_TEXTURE;
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, COLORS.boardTop);
  gradient.addColorStop(1, COLORS.boardBottom);

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = COLORS.smudge;
  for (let index = 0; index < 14; index += 1) {
    context.beginPath();
    context.ellipse(
      random() * width,
      random() * height,
      80 + random() * 220,
      20 + random() * 60,
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
};

/**
 * 분필 글씨. 같은 글자를 조금씩 비껴 여러 번 옅게 겹쳐 가루가 번진 결을 냄.
 *
 * 마지막 한 번만 진하게 써서 글자는 또렷하게 남김.
 */
const drawChalkText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  random: () => number,
): void => {
  context.fillStyle = color;

  context.globalAlpha = 0.18;
  for (let pass = 0; pass < 5; pass += 1) {
    context.fillText(text, x + (random() - 0.5) * 7, y + (random() - 0.5) * 7);
  }

  context.globalAlpha = 0.9;
  context.fillText(text, x, y);
  context.globalAlpha = 1;
};

/** 폭을 넘으면 글자를 줄임. 기기마다 손글씨체 폭이 크게 달라서 둠. */
const fitFontSize = (
  context: CanvasRenderingContext2D,
  text: string,
  maxFontSizePx: number,
): number => {
  context.font = resolveFont(maxFontSizePx);
  const measuredWidth = context.measureText(text).width;

  if (!Number.isFinite(measuredWidth) || measuredWidth <= LAYOUT.maxLineWidth) {
    return maxFontSizePx;
  }

  return Math.floor((maxFontSizePx * LAYOUT.maxLineWidth) / measuredWidth);
};

/** 휘갈긴 밑줄. 두 번 그어 손으로 쓴 느낌을 냄. */
const drawScribbleUnderline = (
  context: CanvasRenderingContext2D,
  startX: number,
  endX: number,
  y: number,
  random: () => number,
): void => {
  context.strokeStyle = COLORS.highlight;
  context.lineWidth = 9;
  context.lineCap = "round";
  context.globalAlpha = 0.85;

  for (let stroke = 0; stroke < 2; stroke += 1) {
    const offsetY = stroke * 16;

    context.beginPath();
    context.moveTo(startX, y + offsetY);
    for (let step = 1; step <= 8; step += 1) {
      const pointX = startX + ((endX - startX) * step) / 8;
      context.lineTo(pointX, y + offsetY + (random() - 0.5) * 12 - step * 1.5);
    }
    context.stroke();
  }

  context.globalAlpha = 1;
};

/** 모서리의 동그라미 친 B. `₿` 글리프가 없는 기기가 있어 선으로 그음. */
const drawCoinDoodle = (context: CanvasRenderingContext2D): void => {
  const { x, y, radius } = LAYOUT.coin;

  context.strokeStyle = COLORS.highlight;
  context.lineWidth = 8;
  context.lineCap = "round";
  context.globalAlpha = 0.9;

  context.beginPath();
  context.arc(x, y, radius, 0.2, Math.PI * 2 - 0.1);
  context.stroke();

  context.fillStyle = COLORS.highlight;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = resolveFont(96);
  context.fillText("B", x, y + 4);

  // B 위아래로 삐져나온 두 줄이 비트코인 기호를 만듦.
  for (const offsetX of [-12, 10]) {
    context.beginPath();
    context.moveTo(x + offsetX, y - radius * 0.78);
    context.lineTo(x + offsetX, y - radius * 0.52);
    context.moveTo(x + offsetX, y + radius * 0.52);
    context.lineTo(x + offsetX, y + radius * 0.78);
    context.stroke();
  }

  context.globalAlpha = 1;
};
// endregion

/** 메뉴판 낙서 한 장을 그린다. */
export const drawMenuGraffiti = (context: CanvasRenderingContext2D): void => {
  const random = createSeededRandom(21_000_000);
  const [firstLine, secondLine] = MENU_GRAFFITI_LINES;
  const highlightIndex = secondLine.lastIndexOf(MENU_GRAFFITI_HIGHLIGHT);
  const secondLinePrefix = secondLine.slice(0, highlightIndex);

  drawBoard(context, random);

  context.save();
  context.translate(MENU_GRAFFITI_TEXTURE.width / 2, MENU_GRAFFITI_TEXTURE.height / 2);
  context.rotate(LAYOUT.rotationRadians);
  context.translate(-MENU_GRAFFITI_TEXTURE.width / 2, -MENU_GRAFFITI_TEXTURE.height / 2);

  context.textAlign = "left";
  context.textBaseline = "alphabetic";

  context.font = resolveFont(fitFontSize(context, firstLine, LAYOUT.firstLine.fontSize));
  drawChalkText(context, firstLine, LAYOUT.firstLine.x, LAYOUT.firstLine.y, COLORS.chalk, random);

  // 둘째 줄은 같은 크기로 이어 쓰고 마지막 낱말만 주황으로 칠함.
  context.font = resolveFont(fitFontSize(context, secondLine, LAYOUT.secondLine.fontSize));
  const prefixWidth = context.measureText(secondLinePrefix).width;
  const highlightWidth = context.measureText(MENU_GRAFFITI_HIGHLIGHT).width;
  const highlightX = LAYOUT.secondLine.x + prefixWidth;

  drawChalkText(
    context,
    secondLinePrefix,
    LAYOUT.secondLine.x,
    LAYOUT.secondLine.y,
    COLORS.chalk,
    random,
  );
  drawChalkText(
    context,
    MENU_GRAFFITI_HIGHLIGHT,
    highlightX,
    LAYOUT.secondLine.y,
    COLORS.highlight,
    random,
  );
  drawScribbleUnderline(
    context,
    highlightX - 6,
    highlightX + highlightWidth + 10,
    LAYOUT.secondLine.y + LAYOUT.underlineOffsetY - 30,
    random,
  );

  context.restore();

  drawCoinDoodle(context);
};
