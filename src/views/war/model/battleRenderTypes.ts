import type { ConnectionStatus, OrderBookLevel, VenueId } from "@/entities/order-flow";

/**
 * 전장 렌더러가 받는 자료 형태.
 *
 * 캔버스 컴포넌트가 커넥터에서 읽어 만들고 렌더 함수가 받는다. 그리기 방식과 무관한
 * 순수 자료라 렌더 계층이 아니라 모델에 둔다.
 */

/** 방어벽으로 그릴 호가 단계 수. */
export const ORDER_WALL_LEVEL_COUNT = 14;

/** 거래소 하나의 방어벽 자료. 가격은 통화가 달라 쓰지 않고 BTC 수량 비율만 쓴다. */
export interface OrderWallSnapshot {
  venue: VenueId;
  bidLevels: OrderBookLevel[];
  askLevels: OrderBookLevel[];
  /** 이 거래소 안에서의 최대 호가 수량. 막대 길이를 자기 기준으로 정규화한다. */
  maxSizeInBtc: number;
  isWeakened: boolean;
}

/** 캔버스 상단에 띄우는 거래소 상태 배지. */
export interface VenueBadgeInfo {
  venue: VenueId;
  status: ConnectionStatus;
}
