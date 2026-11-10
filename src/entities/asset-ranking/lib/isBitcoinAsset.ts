import type { RankedAsset } from "../model/types";

/** 티커만으론 겹칠 수 있어 이름까지 같이 봄. */
export const isBitcoinAsset = (asset: Pick<RankedAsset, "name" | "ticker">): boolean => {
  return asset.ticker === "BTC" && asset.name === "Bitcoin";
};
