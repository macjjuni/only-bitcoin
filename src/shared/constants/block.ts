
// TODO. 반감기 날짜를 멤풀에 조회해서 뿌려주기.
// - 현재 블록 높이 가져와서 지난 지난 반감기 블록 높이 조회 후 날짜를 보여주기
// - 단점: 멤풀에 의존적이므로 네트워크 오류 시 데이터 표시 못 함.
// - 장점: 계속 업데이트 안해줘도 됨.

export interface BlockHalvingDataTypes {
  date: string;
  blockHeight: number;
  blockReward: number;
}

export const blockHalvingData: BlockHalvingDataTypes[] = [
  { date: "2009.01.03", blockHeight: 0, blockReward: 50.0 },
  { date: "2012.11.29", blockHeight: 210000, blockReward: 25.0 },
  { date: "2016.07.10", blockHeight: 420000, blockReward: 12.5 },
  { date: "2020.05.12", blockHeight: 630000, blockReward: 6.25 },
  { date: "2024.04.20", blockHeight: 840000, blockReward: 3.125 },
  { date: "2028", blockHeight: 1050000, blockReward: 1.5625 },
  { date: "2032", blockHeight: 1260000, blockReward: 0.78125 },
  { date: "2036", blockHeight: 1470000, blockReward: 0.390625 },
  { date: "2040", blockHeight: 1680000, blockReward: 0.1953125 },
  { date: "2044", blockHeight: 1890000, blockReward: 0.09765625 },
  { date: "2048", blockHeight: 2100000, blockReward: 0.048828125 },
  { date: "2052", blockHeight: 2310000, blockReward: 0.0244140625 },
  { date: "2056", blockHeight: 2520000, blockReward: 0.01220703125 },
  { date: "2060", blockHeight: 2730000, blockReward: 0.006103515625 },
  { date: "2064", blockHeight: 2940000, blockReward: 0.0030517578125 },
  { date: "2068", blockHeight: 3150000, blockReward: 0.00152587890625 },
  { date: "2072", blockHeight: 3360000, blockReward: 0.000762939453125 },
  { date: "2076", blockHeight: 3570000, blockReward: 0.0003814697265625 },
  { date: "2080", blockHeight: 3780000, blockReward: 0.00019073486328125 },
  { date: "2084", blockHeight: 3990000, blockReward: 0.000095367431640625 },
  { date: "2088", blockHeight: 4200000, blockReward: 0.0000476837158203125 },
  { date: "2092", blockHeight: 4410000, blockReward: 0.00002384185791015625 },
  { date: "2096", blockHeight: 4620000, blockReward: 0.000011920928955078125 },
  { date: "2100", blockHeight: 4830000, blockReward: 0.0000059604644775390625 },
  { date: "2104", blockHeight: 5040000, blockReward: 0.00000298023223876953125 },
  { date: "2108", blockHeight: 5250000, blockReward: 0.000001490116119384765625 },
  { date: "2112", blockHeight: 5460000, blockReward: 0.0000007450580596923828125 },
  { date: "2116", blockHeight: 5670000, blockReward: 0.00000037252902984619140625 },
  { date: "2120", blockHeight: 5880000, blockReward: 0.000000186264514923095703125 },
  { date: "2124", blockHeight: 6090000, blockReward: 0.0000000931322574615478515625 },
  { date: "2128", blockHeight: 6300000, blockReward: 0.00000004656612873077392578125 },
  { date: "2132", blockHeight: 6510000, blockReward: 0.000000023283064365386962890625 },
  { date: "2136", blockHeight: 6720000, blockReward: 0.0000000116415321826934814453125 },
  { date: "2140", blockHeight: 6930000, blockReward: 0.00000000582076609134674072265625 }
];