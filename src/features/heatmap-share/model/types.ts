/**
 * 공유 카드 한 칸. 색과 문구는 화면 쪽에서 정해서 넘김.
 * features 가 views 의 계산 로직을 거꾸로 참조하지 않게 하려고 표시용 값만 받음.
 */
export interface HeatmapShareTile {
  id: string;
  /** 칸 첫 줄. 티커 또는 기타. */
  label: string;
  /** 칸 둘째 줄. 등락률 또는 비중. */
  valueLabel: string;
  /** 면적 기준 값. 시가총액. */
  value: number;
  isBitcoin: boolean;
  fillColor: string;
  textColor: string;
}

export type HeatmapShareTone = "up" | "down" | "flat";

export interface HeatmapShareData {
  tiles: HeatmapShareTile[];
  /** CoinGecko 공식 도미넌스. 칸 비중과는 계산 기준이 다름. */
  bitcoinDominanceLabel: string;
  bitcoinMarketCapLabel: string;
  bitcoinChangeLabel: string;
  bitcoinChangeTone: HeatmapShareTone;
  totalMarketCapLabel: string;
  /** 데이터 수집 시각. 카드 연 시각이 아님. */
  collectedAtLabel: string;
}
