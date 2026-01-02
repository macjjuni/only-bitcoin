

export interface ICurrency {
  ath: number | null;
  ath_change_percentage: number | null;
  ath_date: string | null;
  atl: number | null;
  atl_change_percentage: number | null;
  atl_date: string | null;
  circulating_supply: number | null;
  current_price: number | null;
  fully_diluted_valuation: number | null;
  high_24h: number | null;
  id: string | null;
  image: string | null;
  last_updated: string | null;
  low_24h: number | null;
  market_cap: number;
  market_cap_change_24h: number | null;
  market_cap_change_percentage_24h: number | null;
  market_cap_rank: 1;
  max_supply: number | null;
  name: string | null;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
  roi: null;
  symbol: string | null;
  total_supply: number | null;
  total_volume: number | null;
}
