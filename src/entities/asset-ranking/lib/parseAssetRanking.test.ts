import { describe, expect, it } from "vitest";
import { createAssetRankingHtml } from "./__fixtures__/assetRanking";
import { parseAssetRanking } from "./parseAssetRanking";

describe("parseAssetRanking", () => {
  it("원본 숫자의 정밀도·단위를 보존하고 링크와 국가가 없는 BTC도 파싱한다", () => {
    const assets = parseAssetRanking(createAssetRankingHtml());
    expect(assets).toHaveLength(100);
    expect(assets[1]).toEqual({
      rank: 2,
      name: "Bitcoin",
      ticker: "BTC",
      marketCapInUsd: 1483484374022,
      priceInUsd: 73798,
      dailyChangePercent: -2.7,
      country: null,
      logoUrl: "https://companiesmarketcap.com/img/company-logos/64/BTC.png",
    });
    expect(assets[2].name).toBe("Asset & Fund 3");
    expect(assets[2].dailyChangePercent).toBeNull();
    expect(assets[0].country).toBe("🇺🇸 USA");
  });

  it("소수 가격, 양수와 0% 등락률을 구분한다", () => {
    const html = createAssetRankingHtml()
      .replace('data-sort="7379800"', 'data-sort="123"')
      .replace('data-sort="-270">-2.70%', 'data-sort="52">0.52%')
      .replace('data-sort="-270">-2.70%', 'data-sort="0">0.00%');
    const assets = parseAssetRanking(html);
    expect(assets[0].priceInUsd).toBe(1.23);
    expect(assets[0].dailyChangePercent).toBe(0.52);
    expect(assets[1].dailyChangePercent).toBe(0);
  });

  it("차단 화면이나 부분 응답을 정상 데이터로 취급하지 않는다", () => {
    expect(() => parseAssetRanking("<html>Access denied</html>")).toThrow("행 개수");
    const truncatedHtml = createAssetRankingHtml().replace(/<tr>[\s\S]*?<\/tr>/, "");
    expect(() => parseAssetRanking(truncatedHtml)).toThrow("행 개수");
  });

  it("필수 숫자 누락, 중복 순위, 중복 자산, BTC 누락을 거부한다", () => {
    const html = createAssetRankingHtml();
    expect(() => parseAssetRanking(html.replace('data-sort="7379800"', 'data-sort=""'))).toThrow();
    expect(() => parseAssetRanking(html.replace('data-sort="2"', 'data-sort="1"'))).toThrow();
    expect(() =>
      parseAssetRanking(html.replace("Bitcoin", "Gold").replace(/>BTC</, ">GOLD<")),
    ).toThrow();
    expect(() => parseAssetRanking(html.replace("Bitcoin", "Other"))).toThrow("비트코인");
  });

  it("외부 호스트·허용되지 않은 이미지 경로를 노출하지 않는다", () => {
    const html = createAssetRankingHtml()
      .replace("/img/company-logos/64/GOLD.png", "https://evil.example/logo.png")
      .replace("/img/company-logos/64/BTC.png", "/other/BTC.png");
    const assets = parseAssetRanking(html);
    expect(assets[0].logoUrl).toBeNull();
    expect(assets[1].logoUrl).toBeNull();
  });
});
