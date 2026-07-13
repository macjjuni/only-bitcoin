import type { BlockTypes, FeesTypes } from "../model/blockSlice";
import type { InitialBlocks, MemPoolBlockTypes } from "../model/types";

// region [Privates]
const MEMPOOL_BLOCKS_URL = "https://mempool.space/api/v1/blocks";
const MEMPOOL_FEES_URL = "https://mempool.space/api/v1/fees/recommended";

/**
 * 서버 캐시 주기(초). 블록 평균 생성 간격과 같은 10분.
 * 클라이언트가 소켓으로 즉시 갱신하므로 서버 값은 크롤러와 첫 페인트를 위한 것이면 충분하다.
 */
const REVALIDATE_SECONDS = 60 * 10;

const EMPTY_BLOCK_DATA: InitialBlocks = {
  blocks: [{ id: "", height: 0, timestamp: 0, size: 0, poolName: "-" }],
  fees: { economyFee: 0, fastestFee: 0, halfHourFee: 0, hourFee: 0, minimumFee: 0 },
};

/**
 * 외부 API 호출. 실패해도 렌더링은 계속되어야 하므로 null 로 흡수한다.
 */
const fetchMempool = async <T>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;

    return (await res.json()) as T;
  } catch (error) {
    console.warn(`초기 블록 데이터 조회 실패: ${url}`, error);
    return null;
  }
};
// endregion

// region [Transactions]
/**
 * SSR 초기 블록/수수료 조회.
 *
 * 블록 데이터는 mempool 웹소켓으로만 채워지므로 서버 HTML 에는 높이 0 짜리 빈 블록만 남는다.
 * REST 응답(`/api/v1/blocks`)이 소켓의 blocks 메시지와 같은 구조라 동일하게 변환한다.
 * 클라이언트에서 소켓이 붙으면 이 값은 곧바로 실시간 값으로 대체된다.
 */
export const fetchInitialBlocks = async (): Promise<InitialBlocks> => {
  const [blocks, fees] = await Promise.all([
    fetchMempool<MemPoolBlockTypes[]>(MEMPOOL_BLOCKS_URL),
    fetchMempool<FeesTypes>(MEMPOOL_FEES_URL),
  ]);

  const sanitizedBlocks: BlockTypes[] = (blocks ?? [])
    .map(({ id, height, timestamp, size, extras }) => ({
      id,
      height,
      timestamp,
      size,
      poolName: extras.pool.name,
    }))
    .sort((a, b) => b.height - a.height);

  return {
    blocks: sanitizedBlocks.length ? sanitizedBlocks : EMPTY_BLOCK_DATA.blocks,
    fees: fees ?? EMPTY_BLOCK_DATA.fees,
  };
};
// endregion
