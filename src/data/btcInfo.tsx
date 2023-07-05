import { FaBitcoin } from 'react-icons/fa'
import { BsCurrencyBitcoin } from 'react-icons/bs'

const btcColor = '#f7931a'

export interface CryptoProp {
  label: string
  value: string
  ticker: string
  price: number
  icon: (size: number, color?: string) => JSX.Element
  icon2: (size: number, color?: string) => JSX.Element
  color: string
}

export const btcInfo: CryptoProp = {
  label: 'BTC(BitCoin)',
  value: 'btc',
  ticker: 'KRW-BTC',
  price: 0,
  icon: (size, color) => <FaBitcoin size={size || 28} color={color || btcColor} />,
  icon2: (size, color) => <BsCurrencyBitcoin size={size || 28} color={color || btcColor} />,
  color: btcColor,
}

export const upbitAsset = ['BTC/KRW']
export const binaceAsset = ['btcusdt']
