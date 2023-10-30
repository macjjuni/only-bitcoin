import { FaBitcoin } from 'react-icons/fa'

export const btcColor = '#f7931a'

export interface CryptoProp {
  label: string
  value: string
  ticker: string
  price: number
  icon: (size: number, color?: string) => JSX.Element
  color: string
}

export const btcInfo: CryptoProp = {
  label: 'BTC(BitCoin)',
  value: 'btc',
  ticker: 'KRW-BTC',
  price: 0,
  icon: (size, color) => <FaBitcoin size={size || 28} color={color || btcColor} />,
  color: btcColor,
}

export const upbitAsset = ['BTC/KRW']
export const binaceAsset = ['btcusdt']

// 비트코인 레거시 생태계
// export const ecoSystemPyramid = [
//   { name: 'foo', min: 0, max: 0, emoji: '🐣' },
//   { name: 'shrimp', min: 0, max: 1, emoji: '🦐' },
//   { name: 'crab', min: 1, max: 10, emoji: '🦀' },
//   { name: 'octopus', min: 10, max: 50, emoji: '🐙' },
//   { name: 'fish', min: 50, max: 100, emoji: '🐟' },
//   { name: 'dolphin', min: 100, max: 500, emoji: '🐬' },
//   { name: 'shark', min: 500, max: 1000, emoji: '🦈' },
//   { name: 'whale', min: 1000, max: 5000, emoji: '🐳' },
//   { name: 'humpback', min: 5000, max: 100000, emoji: '🐋' },
// ]

// 비트코인 최신 생태계
export const ecoSystemPyramid = [
  { name: 'foo', min: 0, max: 0, emoji: '🐣' },
  { name: 'shrimp', min: 0.001, max: 0.01, emoji: '🦐' },
  { name: 'crab', min: 0.01, max: 0.1, emoji: '🦀' },
  { name: 'octopus', min: 0.1, max: 0.26, emoji: '🐙' },
  { name: 'fish', min: 0.26, max: 1, emoji: '🐟' },
  { name: 'dolphin', min: 1, max: 3.125, emoji: '🐬' },
  { name: 'shark', min: 3.125, max: 6.15, emoji: '🦈' },
  { name: 'whale', min: 6.15, max: 1000000, emoji: '🐳' },
]

export const btcHalvingData = [
  { date: '2009.01.03', blockNum: 0, currentReward: 50.0 },
  { date: '2012.11.28', blockNum: 210000, currentReward: 25.0 },
  { date: '2016.07.09', blockNum: 420000, currentReward: 12.5 },
  { date: '2020.05.11', blockNum: 630000, currentReward: 6.25 },
  { date: '2024.04.xx', blockNum: 840000, currentReward: 3.125 },
  { date: 2028, blockNum: 1050000, currentReward: 1.5625 },
  { date: 2032, blockNum: 1260000, currentReward: 0.78125 },
  { date: 2036, blockNum: 1470000, currentReward: 0.390625 },
  { date: 2040, blockNum: 1680000, currentReward: 0.1953125 },
  { date: 2044, blockNum: 1890000, currentReward: 0.09765625 },
  { date: 2048, blockNum: 2100000, currentReward: 0.048828125 },
  { date: 2052, blockNum: 2310000, currentReward: 0.0244140625 },
  { date: 2056, blockNum: 2520000, currentReward: 0.01220703125 },
  { date: 2060, blockNum: 2730000, currentReward: 0.006103515625 },
  { date: 2064, blockNum: 2940000, currentReward: 0.0030517578125 },
  { date: 2068, blockNum: 3150000, currentReward: 0.00152587890625 },
  { date: 2072, blockNum: 3360000, currentReward: 0.000762939453125 },
  { date: 2076, blockNum: 3570000, currentReward: 0.0003814697265625 },
  { date: 2080, blockNum: 3780000, currentReward: 0.00019073486328125 },
  { date: 2084, blockNum: 3990000, currentReward: 0.000095367431640625 },
  { date: 2088, blockNum: 4200000, currentReward: 0.0000476837158203125 },
  { date: 2092, blockNum: 4410000, currentReward: 0.00002384185791015625 },
  { date: 2096, blockNum: 4620000, currentReward: 0.000011920928955078125 },
  { date: 2100, blockNum: 4830000, currentReward: 0.0000059604644775390625 },
  { date: 2104, blockNum: 5040000, currentReward: 0.00000298023223876953125 },
  { date: 2108, blockNum: 5250000, currentReward: 0.000001490116119384765625 },
  { date: 2112, blockNum: 5460000, currentReward: 0.0000007450580596923828125 },
  { date: 2116, blockNum: 5670000, currentReward: 0.00000037252902984619140625 },
  { date: 2120, blockNum: 5880000, currentReward: 0.000000186264514923095703125 },
  { date: 2124, blockNum: 6090000, currentReward: 0.0000000931322574615478515625 },
  { date: 2128, blockNum: 6300000, currentReward: 0.00000004656612873077392578125 },
  { date: 2132, blockNum: 6510000, currentReward: 0.000000023283064365386962890625 },
  { date: 2136, blockNum: 6720000, currentReward: 0.0000000116415321826934814453125 },
  { date: 2140, blockNum: 6930000, currentReward: 0.00000000582076609134674072265625 },
]
