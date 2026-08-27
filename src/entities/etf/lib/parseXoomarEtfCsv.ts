import type { XoomarEtfFlowRowResponse } from "../model/types";

const EXPECTED_COLUMN_NAMES = [
  "date",
  "ticker",
  "issuer",
  "asset",
  "holdings",
  "flow_usd",
  "aum_usd",
] as const;

// region [Privates]
const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let currentValue = "";
  let isInsideQuotedValue = false;

  for (let characterIndex = 0; characterIndex < line.length; characterIndex += 1) {
    const character = line[characterIndex];
    const nextCharacter = line[characterIndex + 1];

    if (character === '"' && isInsideQuotedValue && nextCharacter === '"') {
      currentValue += '"';
      characterIndex += 1;
      continue;
    }

    if (character === '"') {
      isInsideQuotedValue = !isInsideQuotedValue;
      continue;
    }

    if (character === "," && !isInsideQuotedValue) {
      values.push(currentValue);
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue);

  return values;
};

const parseOptionalCsvValue = (value: string | undefined): string | null => {
  const trimmedValue = value?.trim() ?? "";

  return trimmedValue === "" ? null : trimmedValue;
};

const isExpectedHeader = (headerColumns: string[]): boolean => {
  return EXPECTED_COLUMN_NAMES.every((columnName, columnIndex) => {
    return headerColumns[columnIndex]?.trim() === columnName;
  });
};
// endregion

/** Xoomar 전체 CSV에서 비트코인 ETF 행만 안전하게 추출한다. */
export const parseXoomarBitcoinEtfCsv = (csvText: string): XoomarEtfFlowRowResponse[] => {
  const lines = csvText.replace(/^\uFEFF/, "").split(/\r?\n/);
  const headerLine = lines.shift();

  if (!headerLine || !isExpectedHeader(parseCsvLine(headerLine))) {
    throw new Error("Xoomar ETF CSV 헤더 형식이 예상과 다릅니다.");
  }

  const bitcoinEtfRows: XoomarEtfFlowRowResponse[] = [];

  for (const line of lines) {
    if (line.trim() === "") {
      continue;
    }

    const [date, ticker, issuer, asset, holdings, flowUsd, aumUsd] = parseCsvLine(line);

    if (asset?.trim().toLowerCase() !== "btc") {
      continue;
    }

    if (!date || !ticker || !issuer) {
      continue;
    }

    bitcoinEtfRows.push({
      date: date.trim(),
      ticker: ticker.trim(),
      issuer: issuer.trim(),
      asset: "btc",
      holdings: parseOptionalCsvValue(holdings),
      flowUsd: parseOptionalCsvValue(flowUsd),
      aumUsd: parseOptionalCsvValue(aumUsd),
    });
  }

  return bitcoinEtfRows;
};
