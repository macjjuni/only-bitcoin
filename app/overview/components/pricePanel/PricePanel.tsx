'use client'

import { useMemo } from 'react'
import useStore from '@/shared/stores/store'
import { CountText, UpdownIcon } from '@/components'

export default function PricePanel() {
  const bitcoinPrice = useStore(state => state.bitcoinPrice)
  const currency = useStore(state => state.setting.currency)

  const Currencies = useMemo(() => [
    {
      code: 'KRW',
      sign: '₩',
      price: Number(bitcoinPrice.krw),
      percent: Number(bitcoinPrice.krwChange24h),
      signSize: 'text-[26px]',
    },
    {
      code: 'USD',
      sign: '$',
      price: Number(bitcoinPrice.usd),
      percent: Number(bitcoinPrice.usdChange24h),
      signSize: 'text-[28px]',
    },
  ], [bitcoinPrice])

  return (
    <div className="flex flex-col gap-2 px-2">
      <div className="flex flex-col gap-0.5 items-start">
        {
          Currencies
            .filter(({ code }) => currency.includes(code))
            .map(({ code, sign, price, percent, signSize }) => (
              <div key={code}
                   className="flex justify-between items-center gap-3 w-full font-bold whitespace-nowrap overflow-hidden text-xl font-number">

                <div className="flex items-center gap-1 flex-1">
                  <span className={`flex justify-center content-center w-6 ${signSize}`}>{sign}</span>
                  <CountText value={price} className="text-3xl"/>
                </div>

                <div className="flex justify-end items-center w-[72px] flex-shrink-0 gap-1 text-sm">
                  <UpdownIcon isUp={percent > 0}/>
                  <span className="text-right">
                    <CountText value={percent} decimals={2}/>
                    %
                </span>
                </div>

              </div>
            ))
        }
      </div>
    </div>
  )
};