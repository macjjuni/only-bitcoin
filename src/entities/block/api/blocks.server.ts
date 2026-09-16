import type { BlockTypes, FeesTypes } from "../model/blockSlice";
import type { InitialBlocks, MemPoolBlockTypes, MempoolRestResponse } from "../model/types";

// region [Privates]
const MEMPOOL_BLOCKS_URL = "https://mempool.space/api/v1/blocks";
const MEMPOOL_FEES_URL = "https://mempool.space/api/v1/fees/precise";
const MEMPOOL_INFO_URL = "https://mempool.space/api/mempool";

/**
 * 서버 캐시 주기(초). 블록 평균 생성 간격과 같은 10분.
 * 클라이언트가 소켓으로 즉시 갱신하므로 서버 값은 크롤러와 첫 페인트를 위한 것이면 충분하다.
 *
 * **이 값이 호출한 페이지의 ISR 주기를 정함.** Next 는 라우트 revalidate 를 렌더에 쓰인
 * 캐시 TTL 중 최솟값으로 잡으므로, 블록 목록 전체가 필요 없는 화면까지 10분을 물면
 * ISR 쓰기만 늘어난다. 그래서 주기를 인자로 받아 화면별로 늦춘다.
 */
const REVALIDATE_SECONDS = 60 * 10;

/**
 * 최신 블록 높이만 쓰는 화면용 주기(초). 1시간.
 * 카운트다운은 소켓이 붙는 즉시 정확해지므로 서버 값은 첫 페인트용이면 충분함.
 */
export const BLOCK_HEIGHT_REVALIDATE_SECONDS = 60 * 60;

/**
 * 채굴 난이도만 쓰는 화면용 주기(초). 6시간.
 * 난이도는 2016블록( 약 2주 )마다 한 번 바뀌므로 더 자주 읽을 이유가 없음.
 */
export const DIFFICULTY_REVALIDATE_SECONDS = 60 * 60 * 6;

const EMPTY_BLOCK_DATA: InitialBlocks = {
  blocks: [{ id: "", height: 0, timestamp: 0, size: 0, poolName: "-", difficulty: 0 }],
  fees: { economyFee: 0, fastestFee: 0, halfHourFee: 0, hourFee: 0, minimumFee: 0 },
  mempoolInfo: { txCount: 0, vsize: 0 },
};

/**
 * 외부 API 호출. 실패해도 렌더링은 계속되어야 하므로 null 로 흡수한다.
 */
const fetchMempool = async <T>(url: string, revalidate: number): Promise<T | null> => {
  try {
    const res = await fetch(url, { next: { revalidate } });
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
export const fetchInitialBlocks = async (
  revalidate: number = REVALIDATE_SECONDS,
): Promise<InitialBlocks> => {
  const [blocks, fees, mempoolInfo] = await Promise.all([
    fetchMempool<MemPoolBlockTypes[]>(MEMPOOL_BLOCKS_URL, revalidate),
    fetchMempool<FeesTypes>(MEMPOOL_FEES_URL, revalidate),
    fetchMempool<MempoolRestResponse>(MEMPOOL_INFO_URL, revalidate),
  ]);

  const sanitizedBlocks: BlockTypes[] = (blocks ?? [])
    .map(({ id, height, timestamp, size, difficulty, extras }) => ({
      id,
      height,
      timestamp,
      size,
      difficulty,
      poolName: extras.pool.name,
    }))
    .sort((a, b) => b.height - a.height);

  return {
    blocks: sanitizedBlocks.length ? sanitizedBlocks : EMPTY_BLOCK_DATA.blocks,
    fees: fees ?? EMPTY_BLOCK_DATA.fees,
    mempoolInfo: mempoolInfo
      ? { txCount: mempoolInfo.count, vsize: mempoolInfo.vsize }
      : EMPTY_BLOCK_DATA.mempoolInfo,
  };
};
// endregion
