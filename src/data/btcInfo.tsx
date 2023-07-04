import { FaBitcoin } from 'react-icons/fa'

export interface CryptoProp {
  label: string
  value: string
  ticker: string
  price: number
  icon: JSX.Element
  color: string
}

export const btcInfo: CryptoProp = {
  label: 'BTC(BitCoin)',
  value: 'btc',
  ticker: 'KRW-BTC',
  price: 0,
  icon: <FaBitcoin size="28" color="#f7931a" />,
  color: '#f7931a',
}

export const upbitAsset = ['BTC/KRW']
export const binaceAsset = ['btcusdt']
