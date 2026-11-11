import { describe, expect, it } from "vitest";
import type { CoinMarketSnapshot } from "@/entities/coin-market";
import { SPACE_HEATMAP_FRAME } from "@/entities/space";
import { drawHeatmap, HEATMAP_TEXTURE, type HeatmapTextureState } from "./heatmapTexture";

const snapshot: CoinMarketSnapshot = {
  coins: [
    {
      id: "bitcoin",
      symbol: "BTC",
      name: "Bitcoin",
      rank: 1,
      marketCapInUsd: 60,
      priceInUsd: 100,
      dailyChangePercent: 3.25,
      isStablecoin: false,
    },
    {
      id: "tether",
      symbol: "USDT",
      name: "Tether",
      rank: 2,
      marketCapInUsd: 20,
      priceInUsd: 1,
      dailyChangePercent: 0.02,
      isStablecoin: true,
    },
  ],
  totalMarketCapInUsd: 100,
  othersMarketCapInUsd: 20,
  bitcoinDominancePercent: 60,
  fetchedAt: "2026-11-11T11:00:00.000Z",
  hasFetchFailed: false,
};

const traceHeatmap = (state: HeatmapTextureState) => {
  const texts: string[] = [];
  const fills: { color: string; x: number; y: number; width: number; height: number }[] = [];
  const properties: Record<string, unknown> = {
    measureText: (text: string) => ({ width: text.length * 14 }),
    fillText: (text: string) => texts.push(text),
    fillRect: (x: number, y: number, width: number, height: number) => {
      fills.push({ color: String(properties.fillStyle), x, y, width, height });
    },
  };
  const context = new Proxy(properties, {
    get: (target, property) => Reflect.get(target, property) ?? (() => undefined),
  }) as unknown as CanvasRenderingContext2D;
  drawHeatmap(context, state);
  return { texts, fills };
};

describe("벽난로 히트맵 텍스처", () => {
  it("화면을 늘리지 않도록 GLB 표시 영역과 같은 비율을 쓴다", () => {
    expect(HEATMAP_TEXTURE.width / HEATMAP_TEXTURE.height).toBeCloseTo(
      SPACE_HEATMAP_FRAME.width / SPACE_HEATMAP_FRAME.height,
      8,
    );
  });

  it("칸이 화면 끝까지 채워지고 시총 비중·등락·중립색을 구분한다", () => {
    const { texts, fills } = traceHeatmap({ snapshot, hasError: false });
    expect(texts).toEqual(expect.arrayContaining(["BTC", "+3.25%", "USDT", "기타", "20.0%"]));
    const tiles = fills.slice(1);
    expect(tiles).toHaveLength(3);
    expect(tiles[0].color).not.toBe(tiles[1].color);
    expect(tiles[1].color).toBe(tiles[2].color);
    expect(Math.min(...tiles.map((tile) => tile.x))).toBe(0);
    expect(Math.min(...tiles.map((tile) => tile.y))).toBe(0);
    expect(Math.max(...tiles.map((tile) => tile.x + tile.width))).toBeCloseTo(
      HEATMAP_TEXTURE.width,
    );
    expect(Math.max(...tiles.map((tile) => tile.y + tile.height))).toBeCloseTo(
      HEATMAP_TEXTURE.height,
    );
    for (const tile of tiles) {
      expect(tile.x).toBeGreaterThanOrEqual(0);
      expect(tile.y).toBeGreaterThanOrEqual(0);
      expect(tile.x + tile.width).toBeLessThanOrEqual(HEATMAP_TEXTURE.width);
      expect(tile.y + tile.height).toBeLessThanOrEqual(HEATMAP_TEXTURE.height);
    }
  });

  it("첫 조회 실패·대기 상태는 가짜 시총 없이 안내만 그린다", () => {
    const pending = traceHeatmap({ hasError: false });
    const failed = traceHeatmap({ hasError: true });
    expect(pending.texts.some((text) => text.includes("불러오는 중"))).toBe(true);
    expect(failed.texts.some((text) => text.includes("불러오지 못했습니다"))).toBe(true);
    expect(failed.fills).toHaveLength(1);
  });

  it("갱신 실패 시 마지막 히트맵을 그대로 유지한다", () => {
    const { texts, fills } = traceHeatmap({ snapshot, hasError: true });
    expect(texts).toContain("BTC");
    expect({ texts, fills }).toEqual(traceHeatmap({ snapshot, hasError: false }));
    expect(fills).toHaveLength(4);
  });
});
