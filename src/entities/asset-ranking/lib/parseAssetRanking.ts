import { load } from "cheerio";
import { ASSET_RANKING_COUNT, ASSET_RANKING_SOURCE_URL } from "../model/constants";
import type { RankedAsset } from "../model/types";
import { isBitcoinAsset } from "./isBitcoinAsset";

// region [Privates]
const parseRequiredNumber = (rawValue: string | undefined): number => {
  if (!rawValue || !/^-?\d+(?:\.\d+)?$/.test(rawValue)) {
    throw new Error("자산 랭킹 숫자 형식이 예상과 다릅니다.");
  }

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue)) {
    throw new Error("자산 랭킹 숫자가 유효하지 않습니다.");
  }
  return parsedValue;
};

/** 원본 HTML의 URL을 그대로 노출하지 않고 동일 호스트의 로고 경로만 사용한다. */
const resolveLogoUrl = (rawUrl: string | undefined): string | null => {
  if (!rawUrl) {
    return null;
  }

  try {
    const sourceUrl = new URL(rawUrl, ASSET_RANKING_SOURCE_URL);
    const hasAllowedPath = /^\/img\/company-logos\/64\/[\w.-]+\.png$/.test(sourceUrl.pathname);

    if (sourceUrl.origin !== new URL(ASSET_RANKING_SOURCE_URL).origin || !hasAllowedPath) {
      return null;
    }
    return `${sourceUrl.origin}${sourceUrl.pathname}`;
  } catch {
    return null;
  }
};
/**
 * 표시용 T/B 축약값 대신 data-sort 원본값을 읽는다.
 * 시가총액은 USD, 가격은 센트, 당일 등락률은 0.01% 단위이므로 뒤의 두 값만 100으로 나눈다.
 * 100개 행 전체를 검증해 구조 변경이나 부분 응답이 정상 캐시를 덮어쓰지 않게 한다.
 */
export const parseAssetRanking = (html: string): RankedAsset[] => {
  const document = load(html);
  const rows = document("table.marketcap-table tbody tr");
  if (rows.length !== ASSET_RANKING_COUNT) {
    throw new Error(`자산 랭킹 행 개수가 예상과 다릅니다: ${rows.length}`);
  }

  const assetIdentities = new Set<string>();
  const assets = rows.toArray().map((row, rowIndex): RankedAsset => {
    const cells = document(row).children("td");
    const rank = parseRequiredNumber(cells.eq(0).attr("data-sort"));
    const name = cells.eq(1).find(".company-name").text().trim();
    const ticker = cells
      .eq(1)
      .find(".company-code")
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim();
    const marketCapInUsd = parseRequiredNumber(cells.eq(2).attr("data-sort"));
    const priceInUsd = parseRequiredNumber(cells.eq(3).attr("data-sort")) / 100;
    const dailyChangeCell = cells.eq(4);
    const dailyChangeText = dailyChangeCell.text().trim();
    const hasNoDailyChange = !dailyChangeText || /^[—–-]$/.test(dailyChangeText);
    const dailyChangePercent = hasNoDailyChange
      ? null
      : parseRequiredNumber(dailyChangeCell.attr("data-sort")) / 100;
    const identity = `${name}:${ticker}`;

    if (
      cells.length !== 7 ||
      rank !== rowIndex + 1 ||
      !name ||
      !ticker ||
      marketCapInUsd <= 0 ||
      priceInUsd <= 0 ||
      assetIdentities.has(identity)
    ) {
      throw new Error(`자산 랭킹 ${rowIndex + 1}번째 행이 유효하지 않습니다.`);
    }
    assetIdentities.add(identity);

    return {
      rank,
      name,
      ticker,
      marketCapInUsd,
      priceInUsd,
      dailyChangePercent,
      country: cells.eq(6).text().trim() || null,
      logoUrl: resolveLogoUrl(cells.eq(1).find("img.company-logo").attr("src")),
    };
  });

  if (!assets.some(isBitcoinAsset)) {
    throw new Error("자산 랭킹에서 비트코인을 찾지 못했습니다.");
  }
  return assets;
};
// endregion
