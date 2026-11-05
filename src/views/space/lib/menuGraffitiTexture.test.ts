import { describe, expect, it } from "vitest";
import { SPACE_MENU_FRAME } from "@/entities/space";
import {
  drawMenuGraffiti,
  MENU_GRAFFITI_HIGHLIGHT,
  MENU_GRAFFITI_LINES,
  MENU_GRAFFITI_TEXTURE,
} from "@/views/space/lib/menuGraffitiTexture";

/** 그리기 호출만 기록하는 가짜 캔버스. 글자와 그때의 색을 모음. */
const traceGraffiti = () => {
  const texts: { text: string; color: string }[] = [];
  const ignoredDrawingOperation = (): void => undefined;
  const canvasProperties: Record<string, unknown> = {
    measureText: (text: string) => ({ width: text.length * 60 }),
    createLinearGradient: () => ({ addColorStop: ignoredDrawingOperation }),
    fillText: (text: string) => {
      texts.push({ text, color: String(canvasProperties.fillStyle) });
    },
  };
  const context = new Proxy(canvasProperties, {
    get: (target, property) => Reflect.get(target, property) ?? ignoredDrawingOperation,
  }) as unknown as CanvasRenderingContext2D;

  drawMenuGraffiti(context);

  return texts;
};

describe("drawMenuGraffiti", () => {
  it("Not your keys, not your bitcoin 을 두 줄로 쓴다", () => {
    expect(MENU_GRAFFITI_LINES.join(" ")).toBe("Not your keys, not your bitcoin");

    const texts = traceGraffiti().map((entry) => entry.text);

    expect(texts).toContain("Not your keys,");
    expect(texts).toContain("not your ");
    expect(texts).toContain(MENU_GRAFFITI_HIGHLIGHT);
  });

  it("마지막 낱말만 다른 색으로 칠한다", () => {
    const texts = traceGraffiti();
    const firstLineColor = texts.find((entry) => entry.text === "Not your keys,")?.color;
    const highlightColor = texts.find((entry) => entry.text === MENU_GRAFFITI_HIGHLIGHT)?.color;

    expect(highlightColor).toBeDefined();
    expect(highlightColor).not.toBe(firstLineColor);
  });

  it("같은 낙서를 매번 똑같이 그린다", () => {
    // 번짐 위치가 매번 달라지면 다시 그릴 때 글자가 떤다.
    expect(traceGraffiti()).toEqual(traceGraffiti());
  });

  it("텍스처 비율이 메뉴판과 같다", () => {
    expect(MENU_GRAFFITI_TEXTURE.width / MENU_GRAFFITI_TEXTURE.height).toBeCloseTo(
      SPACE_MENU_FRAME.width / SPACE_MENU_FRAME.height,
      6,
    );
  });
});
