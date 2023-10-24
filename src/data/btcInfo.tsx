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

// 비트코인 생태계 다음 버전
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
