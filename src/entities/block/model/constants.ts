export interface BlockHalvingDataTypes {
  date: string;
  blockHeight: number;
  blockReward: number | string;
}

export const GENESIS_BLOCK = {
  height: 0,
  size: 285,
  poolName: "Unknown",
  timestamp: 1231006505,
} as const;

export const blockHalvingData: BlockHalvingDataTypes[] = [
  { date: "2009.01.03", blockHeight: 0, blockReward: "50.00000000" },
  { date: "2012.11.29", blockHeight: 210000, blockReward: "25.00000000" },
  { date: "2016.07.10", blockHeight: 420000, blockReward: "12.50000000" },
  { date: "2020.05.12", blockHeight: 630000, blockReward: "6.25000000" },
  { date: "2024.04.20", blockHeight: 840000, blockReward: "3.12500000" },
  { date: "2028", blockHeight: 1050000, blockReward: "1.56250000" },
  { date: "2032", blockHeight: 1260000, blockReward: "0.78125000" },
  { date: "2036", blockHeight: 1470000, blockReward: "0.39062500" },
  { date: "2040", blockHeight: 1680000, blockReward: "0.19531250" },
  { date: "2044", blockHeight: 1890000, blockReward: "0.09765625" },
  { date: "2048", blockHeight: 2100000, blockReward: "0.04882812" },
  { date: "2052", blockHeight: 2310000, blockReward: "0.02441406" },
  { date: "2056", blockHeight: 2520000, blockReward: "0.01220703" },
  { date: "2060", blockHeight: 2730000, blockReward: "0.00610351" },
  { date: "2064", blockHeight: 2940000, blockReward: "0.00305175" },
  { date: "2068", blockHeight: 3150000, blockReward: "0.00152587" },
  { date: "2072", blockHeight: 3360000, blockReward: "0.00076293" },
  { date: "2076", blockHeight: 3570000, blockReward: "0.00038146" },
  { date: "2080", blockHeight: 3780000, blockReward: "0.00019073" },
  { date: "2084", blockHeight: 3990000, blockReward: "0.00009536" },
  { date: "2088", blockHeight: 4200000, blockReward: "0.00004768" },
  { date: "2092", blockHeight: 4410000, blockReward: "0.00002384" },
  { date: "2096", blockHeight: 4620000, blockReward: "0.00001192" },
  { date: "2100", blockHeight: 4830000, blockReward: "0.00000596" },
  { date: "2104", blockHeight: 5040000, blockReward: "0.00000298" },
  { date: "2108", blockHeight: 5250000, blockReward: "0.00000149" },
  { date: "2112", blockHeight: 5460000, blockReward: "0.00000074" },
  { date: "2116", blockHeight: 5670000, blockReward: "0.00000037" },
  { date: "2120", blockHeight: 5880000, blockReward: "0.00000018" },
  { date: "2124", blockHeight: 6090000, blockReward: "0.00000009" },
  { date: "2128", blockHeight: 6300000, blockReward: "0.00000004" },
  { date: "2132", blockHeight: 6510000, blockReward: "0.00000002" },
  { date: "2136", blockHeight: 6720000, blockReward: "0.00000001" },
  { date: "2140", blockHeight: 6930000, blockReward: "0.00000000" },
];
