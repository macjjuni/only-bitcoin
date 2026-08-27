import archiveJson from "../model/bitcoinEtfFlowArchive.json";
import type { BitcoinEtfFlowArchive, XoomarEtfFlowResponse } from "../model/types";

const XOOMAR_ETF_SOURCE = "xoomar.com";
const XOOMAR_ETF_DOCS_URL = "https://xoomar.com/markets/api/etf-flows";

const archive = archiveJson as BitcoinEtfFlowArchive;

/** 저장된 비트코인 ETF 전체 이력을 Xoomar 응답 형태로 제공한다. */
export const getArchivedXoomarEtfResponse = (): XoomarEtfFlowResponse => {
  return {
    data: archive.rows,
    updatedAt: archive.sourceUpdatedAt,
    source: XOOMAR_ETF_SOURCE,
    docs: XOOMAR_ETF_DOCS_URL,
  };
};

/** 런타임 최근 구간 조회 범위를 계산할 때 사용하는 아카이브 최종 원천일. */
export const getBitcoinEtfArchiveLatestSourceDate = (): string => {
  return archive.latestSourceDate;
};
