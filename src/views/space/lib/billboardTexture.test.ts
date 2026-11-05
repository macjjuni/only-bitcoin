import { describe, expect, it } from "vitest";
import type { BtcCandle } from "@/entities/bitcoin";
import { SPACE_BILLBOARD, SPACE_SCREEN_HALF, SPACE_SCREEN_SCALE } from "@/entities/space";
import {
  BILLBOARD_CHART_MARKER,
  BILLBOARD_CHART_REGION,
  BILLBOARD_COLORS,
  BILLBOARD_COLUMNS,
  BILLBOARD_MIN_FONT_SIZE_PX,
  BILLBOARD_ONLINE_MARKER,
  BILLBOARD_PLACEHOLDER,
  BILLBOARD_PRICE_LINE,
  BILLBOARD_TEXTURE,
  type BillboardChartEndpoint,
  type BillboardState,
  drawBillboard,
  drawBillboardChart,
  formatBillboardChange,
  formatBillboardExRate,
  formatBillboardKrw,
  formatBillboardUsd,
  resolveBillboardChartEndpoint,
  resolveBillboardOnlineStatus,
  resolveChangeTone,
  resolveFittedFontSize,
  resolveToneColor,
} from "@/views/space/lib/billboardTexture";

/** 등폭 폰트(SF Mono·Menlo) 의 글자 전진폭 비율. */
const MONOSPACE_ADVANCE_RATIO = 0.6;

const measureMonospaceWidth = (text: string, fontSizePx: number): number => {
  return text.length * MONOSPACE_ADVANCE_RATIO * fontSizePx;
};

/** 30분봉 48개. 완만하게 오르내리는 실제 모양을 흉내 냄. */
const createCandles = (count = 48): BtcCandle[] => {
  return Array.from({ length: count }, (_, index) => {
    const open = 100_000 + Math.sin(index / 6) * 800 + index * 20;
    const close = open + Math.cos(index / 3) * 250;

    return {
      openTime: 1_762_000_000_000 + index * 1_800_000,
      open,
      high: Math.max(open, close) + 120,
      low: Math.min(open, close) - 120,
      close,
      quoteVolume: 500_000_000 + (index % 7) * 80_000_000,
    };
  });
};

const createState = (overrides: Partial<BillboardState> = {}): BillboardState => ({
  krw: 150_000_000,
  usd: 104_280,
  krwChange24h: "1.2",
  usdChange24h: "1.2",
  isKrwConnected: true,
  isUsdConnected: true,
  exRate: 1_386.5,
  candles: [],
  ...overrides,
});

describe("formatBillboardKrw", () => {
  it("천 단위를 끊어 원화 기호와 함께 보여준다", () => {
    expect(formatBillboardKrw(158_420_000)).toBe("₩158,420,000");
  });

  it("소수점은 버린다", () => {
    expect(formatBillboardKrw(158_420_000.7)).toBe("₩158,420,001");
  });

  it("스토어 초기값 0 과 비정상 값은 자리표시로 바꾼다", () => {
    expect(formatBillboardKrw(0)).toBe(BILLBOARD_PLACEHOLDER);
    expect(formatBillboardKrw(-1)).toBe(BILLBOARD_PLACEHOLDER);
    expect(formatBillboardKrw(Number.NaN)).toBe(BILLBOARD_PLACEHOLDER);
    expect(formatBillboardKrw(Number.POSITIVE_INFINITY)).toBe(BILLBOARD_PLACEHOLDER);
  });
});

describe("formatBillboardUsd", () => {
  it("달러는 소수점 없이 반올림해 보여준다", () => {
    expect(formatBillboardUsd(108_432.5)).toBe("$108,433");
    expect(formatBillboardUsd(100_000)).toBe("$100,000");
  });

  it("값이 없으면 자리표시다", () => {
    expect(formatBillboardUsd(0)).toBe(BILLBOARD_PLACEHOLDER);
  });
});

describe("formatBillboardExRate", () => {
  it("정수로 반올림해 USD/KRW 로 보여준다", () => {
    expect(formatBillboardExRate(1_386.52)).toBe("USD/KRW 1,387");
    expect(formatBillboardExRate(1_400)).toBe("USD/KRW 1,400");
  });

  it("쿼리가 꺼진 0 과 비정상 값은 줄 자체를 비운다", () => {
    expect(formatBillboardExRate(0)).toBe("");
    expect(formatBillboardExRate(-1)).toBe("");
    expect(formatBillboardExRate(Number.NaN)).toBe("");
  });
});

describe("formatBillboardChange", () => {
  it("상승은 부호를 붙이고 소수 한 자리로 반올림한다", () => {
    expect(formatBillboardChange("2.4")).toBe("+2.4%");
    expect(formatBillboardChange(2.46)).toBe("+2.5%");
  });

  it("하락은 음수 부호를 유지한다", () => {
    expect(formatBillboardChange("-1.24")).toBe("-1.2%");
  });

  it("보합은 부호를 붙이지 않는다", () => {
    expect(formatBillboardChange("0")).toBe("0.0%");
    // 반올림해서 0 이 되면 부호도 떼고 보합으로 본다.
    expect(formatBillboardChange("0.04")).toBe("0.0%");
    expect(resolveChangeTone("0.04")).toBe("flat");
  });

  it("해석할 수 없는 값은 자리표시다", () => {
    expect(formatBillboardChange("")).toBe(BILLBOARD_PLACEHOLDER);
    expect(formatBillboardChange("n/a")).toBe(BILLBOARD_PLACEHOLDER);
  });
});

describe("resolveChangeTone", () => {
  it("부호에 따라 톤을 가른다", () => {
    expect(resolveChangeTone("2.4")).toBe("up");
    expect(resolveChangeTone("-2.4")).toBe("down");
    expect(resolveChangeTone("0")).toBe("flat");
  });

  it("해석 불가는 보합으로 본다", () => {
    expect(resolveChangeTone("n/a")).toBe("flat");
  });

  it("톤 색은 프로젝트 팔레트를 따른다", () => {
    expect(resolveToneColor("up")).toBe(BILLBOARD_COLORS.up);
    expect(resolveToneColor("down")).toBe(BILLBOARD_COLORS.down);
    // 보합은 흰색. 가격 글자도 통화와 무관하게 같은 색을 쓴다.
    expect(resolveToneColor("flat")).toBe(BILLBOARD_COLORS.flat);
    expect(BILLBOARD_COLORS.flat).toBe("#ffffff");
  });
});

describe("resolveFittedFontSize", () => {
  const PRICE_WIDTH = BILLBOARD_COLUMNS.priceMaxWidth;
  /** `LAYOUT.rowPrice.fontSize` 와 같은 값. 레이아웃은 내보내지 않는다. */
  const PRICE_FONT_SIZE = 120;

  it("가용 폭에 들어가는 문자열은 최대 크기를 유지한다", () => {
    const measuredWidth = measureMonospaceWidth("$108,433", PRICE_FONT_SIZE);

    expect(
      resolveFittedFontSize(measuredWidth, {
        maxWidth: PRICE_WIDTH,
        maxFontSizePx: PRICE_FONT_SIZE,
      }),
    ).toBe(PRICE_FONT_SIZE);
  });

  it("넘치는 문자열은 가용 폭에 맞게 줄인다", () => {
    // 칸 폭을 넓힐 때마다 테스트가 깨지지 않도록 넘치는 길이를 역산한다.
    // 전에는 `₩1,234,567,890` 을 박아 뒀다가 칸이 800 → 980 으로 넓어지면서
    // 더는 넘치지 않아 조용히 통과 조건을 잃었다.
    const overflowLength = Math.ceil(PRICE_WIDTH / (MONOSPACE_ADVANCE_RATIO * PRICE_FONT_SIZE)) + 2;
    const priceText = `₩${"1".repeat(overflowLength - 1)}`;
    const measuredWidth = measureMonospaceWidth(priceText, PRICE_FONT_SIZE);
    const fittedFontSize = resolveFittedFontSize(measuredWidth, {
      maxWidth: PRICE_WIDTH,
      maxFontSizePx: PRICE_FONT_SIZE,
    });

    expect(fittedFontSize).toBeLessThan(PRICE_FONT_SIZE);
    expect(measureMonospaceWidth(priceText, fittedFontSize)).toBeLessThanOrEqual(PRICE_WIDTH);
  });

  it("실제 시세 자리수 범위에서 가격이 변동률 칸을 침범하지 않는다", () => {
    const prices = [9_000_000, 58_420_000, 158_420_000, 999_999_999, 1_234_567_890];

    for (const price of prices) {
      const priceText = formatBillboardKrw(price);
      const measuredWidth = measureMonospaceWidth(priceText, PRICE_FONT_SIZE);
      const fittedFontSize = resolveFittedFontSize(measuredWidth, {
        maxWidth: PRICE_WIDTH,
        maxFontSizePx: PRICE_FONT_SIZE,
      });

      expect(measureMonospaceWidth(priceText, fittedFontSize)).toBeLessThanOrEqual(PRICE_WIDTH);
    }
  });

  it("변동률도 자기 칸을 넘지 않는다", () => {
    const changeText = formatBillboardChange("-12.34");
    const measuredWidth = measureMonospaceWidth(changeText, 60);
    const fittedFontSize = resolveFittedFontSize(measuredWidth, {
      maxWidth: BILLBOARD_COLUMNS.changeMaxWidth,
      maxFontSizePx: 60,
    });

    expect(measureMonospaceWidth(changeText, fittedFontSize)).toBeLessThanOrEqual(
      BILLBOARD_COLUMNS.changeMaxWidth,
    );
  });

  it("하한보다 작게 줄이지 않는다", () => {
    const fittedFontSize = resolveFittedFontSize(100_000, {
      maxWidth: PRICE_WIDTH,
      maxFontSizePx: PRICE_FONT_SIZE,
    });

    expect(fittedFontSize).toBe(BILLBOARD_MIN_FONT_SIZE_PX);
  });

  it("최대 크기가 하한보다 작으면 최대 크기를 넘기지 않는다", () => {
    const smallMaxFontSize = BILLBOARD_MIN_FONT_SIZE_PX - 10;
    const fittedFontSize = resolveFittedFontSize(100_000, {
      maxWidth: PRICE_WIDTH,
      maxFontSizePx: smallMaxFontSize,
    });

    expect(fittedFontSize).toBe(smallMaxFontSize);
  });

  it("폭을 재지 못한 경우 최대 크기로 둔다", () => {
    const options = { maxWidth: PRICE_WIDTH, maxFontSizePx: PRICE_FONT_SIZE };

    expect(resolveFittedFontSize(0, options)).toBe(PRICE_FONT_SIZE);
    expect(resolveFittedFontSize(Number.NaN, options)).toBe(PRICE_FONT_SIZE);
  });
});

describe("resolveBillboardChartEndpoint", () => {
  it("캔들이 없거나 하나뿐이면 끝점 효과를 만들지 않는다", () => {
    expect(resolveBillboardChartEndpoint({ candles: [], usdChange24h: "1.2" })).toBeNull();
    expect(
      resolveBillboardChartEndpoint({ candles: createCandles(1), usdChange24h: "0" }),
    ).toBeNull();
  });

  it.each([
    { change: "-2.4", expectedColor: BILLBOARD_COLORS.down },
    { change: "0", expectedColor: BILLBOARD_COLORS.up },
  ])("24시간 변동률 $change에서 실제 차트의 현재가 점·점선 색을 반환한다", ({
    change,
    expectedColor,
  }) => {
    const candles = createCandles();
    const endpoint = resolveBillboardChartEndpoint({ candles, usdChange24h: change });
    const drawingTrace: { endpoint: BillboardChartEndpoint | null; markerColor: string | null } = {
      endpoint: null,
      markerColor: null,
    };
    let currentCircle: { x: number; y: number; radius: number } | null = null;
    let lineDash: number[] = [];
    const ignoredDrawingOperation = (): void => undefined;
    // 실제 drawBillboard 호출에서 현재가 점선과 점만 기록해 레이아웃 상수 복제를 피한다.
    const canvasProperties: Record<string, unknown> = {
      measureText: (text: string) => ({ width: measureMonospaceWidth(text, 36) }),
      createLinearGradient: () => ({ addColorStop: ignoredDrawingOperation }),
      setLineDash: (segments: number[]) => {
        lineDash = segments;
      },
      beginPath: () => {
        currentCircle = null;
      },
      arc: (x: number, y: number, radius: number) => {
        currentCircle = { x, y, radius };
      },
      fill: () => {
        if (currentCircle?.radius === BILLBOARD_CHART_MARKER.coreRadius) {
          drawingTrace.endpoint = {
            x: currentCircle.x,
            y: currentCircle.y,
            color: String(canvasProperties.fillStyle),
          };
        }
      },
      stroke: () => {
        if (lineDash.join(",") === BILLBOARD_PRICE_LINE.dashSegments.join(",")) {
          drawingTrace.markerColor = String(canvasProperties.strokeStyle);
        }
      },
    };
    const context = new Proxy(canvasProperties, {
      get: (target, property) => Reflect.get(target, property) ?? ignoredDrawingOperation,
    }) as unknown as CanvasRenderingContext2D;

    drawBillboard(context, createState({ usd: 999_999, usdChange24h: change, candles }));

    expect(endpoint?.color).toBe(expectedColor);
    expect(drawingTrace.endpoint).toEqual(endpoint);
    expect(drawingTrace.markerColor).toBe(endpoint?.color);
  });

  /** 펄스 링은 3D 로 겹치므로 패널을 넘으면 허공에 뜬다. */
  it("현재가 점의 확산 링이 패널 안에 머문다", () => {
    const endpoint = resolveBillboardChartEndpoint({
      candles: createCandles(),
      usdChange24h: "1",
    });

    expect(endpoint).not.toBeNull();
    expect((endpoint?.x ?? 0) + BILLBOARD_CHART_MARKER.pulseRadius).toBeLessThanOrEqual(
      BILLBOARD_TEXTURE.width,
    );
  });
});

describe("resolveBillboardOnlineStatus", () => {
  it.each([
    { isKrwConnected: true, isUsdConnected: true, expected: true },
    { isKrwConnected: true, isUsdConnected: false, expected: true },
    { isKrwConnected: false, isUsdConnected: true, expected: true },
    { isKrwConnected: false, isUsdConnected: false, expected: false },
  ])("업비트 $isKrwConnected · 바이낸스 $isUsdConnected 면 $expected", ({
    isKrwConnected,
    isUsdConnected,
    expected,
  }) => {
    // 한쪽만 살아도 온라인이다. 숫자가 바뀌는데 오프라인이라고 적으면 더 혼란스럽다.
    expect(resolveBillboardOnlineStatus({ isKrwConnected, isUsdConnected })).toBe(expected);
  });
});

describe("우측 상단 접속 배지", () => {
  const traceBadge = (isKrwConnected: boolean, isUsdConnected: boolean) => {
    const badge: { dotColor: string | null; label: string | null } = {
      dotColor: null,
      label: null,
    };
    let currentCircle: { radius: number } | null = null;
    const ignoredDrawingOperation = (): void => undefined;
    const canvasProperties: Record<string, unknown> = {
      measureText: (text: string) => ({ width: measureMonospaceWidth(text, 36) }),
      createLinearGradient: () => ({ addColorStop: ignoredDrawingOperation }),
      beginPath: () => {
        currentCircle = null;
      },
      arc: (_x: number, _y: number, radius: number) => {
        currentCircle = { radius };
      },
      fill: () => {
        if (currentCircle?.radius === BILLBOARD_ONLINE_MARKER.coreRadius) {
          badge.dotColor = String(canvasProperties.fillStyle);
        }
      },
      fillText: (text: string) => {
        if (text === "LIVE" || text === "OFFLINE") {
          badge.label = text;
        }
      },
    };
    const context = new Proxy(canvasProperties, {
      get: (target, property) => Reflect.get(target, property) ?? ignoredDrawingOperation,
    }) as unknown as CanvasRenderingContext2D;

    drawBillboard(context, createState({ isKrwConnected, isUsdConnected }));

    return badge;
  };

  it("접속 중에는 초록 점과 LIVE 문구를 그린다", () => {
    expect(traceBadge(true, true)).toEqual({
      dotColor: BILLBOARD_COLORS.online,
      label: "LIVE",
    });
  });

  it("양쪽 피드가 끊기면 빨간 점과 OFFLINE 문구를 그린다", () => {
    expect(traceBadge(false, false)).toEqual({
      dotColor: BILLBOARD_COLORS.offline,
      label: "OFFLINE",
    });
  });

  /** 펄스 링은 텍스처가 아니라 3D 로 겹치므로 패널을 넘으면 허공에 뜬다. */
  it("확산 링이 패널 안에 머문다", () => {
    const { x, y, coreRadius, pulseRadius } = BILLBOARD_ONLINE_MARKER;

    expect(pulseRadius).toBeGreaterThan(coreRadius);
    expect(x + pulseRadius).toBeLessThanOrEqual(BILLBOARD_TEXTURE.width);
    expect(x - pulseRadius).toBeGreaterThanOrEqual(0);
    expect(y + pulseRadius).toBeLessThanOrEqual(BILLBOARD_TEXTURE.height);
    expect(y - pulseRadius).toBeGreaterThanOrEqual(0);
  });
});

describe("패널 비율", () => {
  /**
   * 텍스처와 geometry 의 비율이 어긋나면 글자와 차트가 늘어나거나 눌린다.
   * 둘이 다른 파일(entities / views)에 있어 한쪽만 바꾸기 쉬우므로 묶어 둔다.
   */
  it("패널 geometry 비율이 텍스처 비율과 같다", () => {
    expect(SPACE_BILLBOARD.width / SPACE_BILLBOARD.height).toBeCloseTo(
      BILLBOARD_TEXTURE.width / BILLBOARD_TEXTURE.height,
      6,
    );
  });

  it("액자 반쪽에 끼운 패널도 텍스처 비율을 유지한다", () => {
    // 패널은 한 배율로만 키운다. 폭과 높이를 따로 맞추면 글자가 늘어난다.
    const scaled = {
      width: SPACE_BILLBOARD.width * SPACE_SCREEN_SCALE,
      height: SPACE_BILLBOARD.height * SPACE_SCREEN_SCALE,
    };

    expect(scaled.width / scaled.height).toBeCloseTo(
      BILLBOARD_TEXTURE.width / BILLBOARD_TEXTURE.height,
      6,
    );
    expect(scaled.width).toBeLessThanOrEqual(SPACE_SCREEN_HALF.width + 1e-9);
    expect(scaled.height).toBeLessThanOrEqual(SPACE_SCREEN_HALF.height + 1e-9);
  });
});

describe("별도 차트 텍스처", () => {
  /** 실제 그리기에서 차트 끝점(현재가 점)이 찍힌 좌표만 기록한다. */
  const traceEndpointDraws = (draw: (context: CanvasRenderingContext2D) => void) => {
    const endpoints: { x: number; y: number }[] = [];
    let currentCircle: { x: number; y: number; radius: number } | null = null;
    let offset = { x: 0, y: 0 };
    const ignoredDrawingOperation = (): void => undefined;
    const canvasProperties: Record<string, unknown> = {
      canvas: { width: BILLBOARD_CHART_REGION.width, height: BILLBOARD_CHART_REGION.height },
      measureText: (text: string) => ({ width: measureMonospaceWidth(text, 36) }),
      createLinearGradient: () => ({ addColorStop: ignoredDrawingOperation }),
      setTransform: (_a: number, _b: number, _c: number, _d: number, e: number, f: number) => {
        offset = { x: e, y: f };
      },
      beginPath: () => {
        currentCircle = null;
      },
      arc: (x: number, y: number, radius: number) => {
        currentCircle = { x, y, radius };
      },
      fill: () => {
        if (currentCircle?.radius === BILLBOARD_CHART_MARKER.coreRadius) {
          endpoints.push({ x: currentCircle.x + offset.x, y: currentCircle.y + offset.y });
        }
      },
    };
    const context = new Proxy(canvasProperties, {
      get: (target, property) => Reflect.get(target, property) ?? ignoredDrawingOperation,
    }) as unknown as CanvasRenderingContext2D;

    draw(context);

    return endpoints;
  };

  it("차트 칸이 패널 안에 있고 현재가 점을 감싼다", () => {
    const { x, y, width, height } = BILLBOARD_CHART_REGION;
    const endpoint = resolveBillboardChartEndpoint({
      candles: createCandles(),
      usdChange24h: "1",
    });

    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + width).toBeLessThanOrEqual(BILLBOARD_TEXTURE.width);
    expect(y + height).toBeLessThanOrEqual(BILLBOARD_TEXTURE.height);
    expect(endpoint?.x).toBeGreaterThan(x);
    expect(endpoint?.x).toBeLessThan(x + width);
  });

  it("큰 텍스처는 차트를 빼고 그릴 수 있다", () => {
    const candles = createCandles();
    const endpoints = traceEndpointDraws((context) => {
      drawBillboard(context, createState({ candles }), { shouldDrawChart: false });
    });

    expect(endpoints).toEqual([]);
  });

  it("차트 텍스처에는 칸 원점 기준으로 같은 자리에 점을 찍는다", () => {
    const candles = createCandles();
    const endpoint = resolveBillboardChartEndpoint({ candles, usdChange24h: "1" });
    const endpoints = traceEndpointDraws((context) => {
      drawBillboardChart(context, { candles, usdChange24h: "1" });
    });

    // 점은 전체 좌표로 찍히고 변환이 칸 원점만큼 뺀다. 변환을 적용한 위치가 칸 안 좌표다.
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]?.x).toBeCloseTo((endpoint?.x ?? 0) - BILLBOARD_CHART_REGION.x, 6);
    expect(endpoints[0]?.y).toBeCloseTo((endpoint?.y ?? 0) - BILLBOARD_CHART_REGION.y, 6);
  });
});
