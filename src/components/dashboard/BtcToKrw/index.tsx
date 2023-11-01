import { useEffect, useState, useRef, useCallback } from 'react'
import { Stack, FormGroup, FormControlLabel, Checkbox, FormControl, InputLabel, OutlinedInput, InputAdornment, Typography } from '@mui/material'
import { BiTransferAlt } from 'react-icons/bi'
// Zustand
import { useBearStore } from '@/zustand/store'
import { type IBtc } from '@/zustand/type'
// Components
import WidgetFrame from '@/components/molecule/WidgetFrame'
import CopyButton from '@/components/atom/CopyButton'
import EcoSystemDialog from '@/components/modal/EcoSystemDialog'
import SatIcon from '@/components/icon/SatIcon'

import { btcInfo, ecoSystemPyramid } from '@/data/btcInfo'
import { comma, isSafari } from '@/utils/common'
import BtcIcon from '@/components/icon/BtcIcon'
import KrwIcon from '@/components/icon/KrwIcon'

interface IBtcToKrw {
  btc: IBtc
  isEcoSystem: boolean
}

const numReg = /^[-+]?(\d+(\.\d*)?|\.\d+)$/
const commaLength = 5 // 소숫점
const satoshi = 100000000

const BtcToKrw = ({ btc, isEcoSystem }: IBtcToKrw) => {
  const amount = useBearStore((state) => state.amount)
  const setAmount = useBearStore((state) => state.setAmount)

  // state
  const [standard, setStandard] = useState(false) // 기준 : 개수(false) or 가격(false)
  const [price, setPrice] = useState('0') // 금액
  const [sat, setSat] = useState('0')
  // state - Eco System
  const [isEco, setEco] = useState(false)
  const [emoji, setEmoji] = useState('')

  // ref
  const chkRef = useRef<HTMLDivElement>(null)

  // 인풋 초기화
  const initialInput = useCallback(() => {
    setAmount('0')
    setPrice('0')
    setSat('0')
  }, [])

  // 가격 계산
  const calcPrice = useCallback(
    (amt: number) => {
      return comma((btc.krw * Number(amt)).toFixed(0).toString())
    },
    [btc]
  )

  // 비트코인 개수 변경
  const handleAmount = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const amountTxt = e.target.value
    if (amountTxt === '' || amountTxt === '0') setAmount('0')
    else {
      const cleanNum = amountTxt.replace(/^0+/, '')
      if (cleanNum.charAt(0) === '.') setAmount(`0${cleanNum}`)
      else setAmount(cleanNum)
      setPrice(calcPrice(Number(amountTxt)))
    }
  }, [])
  // IOS 전용
  const iosHandleAmount = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const amountTxt = e.target.value
    setAmount(amountTxt)
    setPrice(calcPrice(Number(amountTxt)))
  }, [])

  // 원화 금액 변경
  const handlePrice = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const priceTxt = e.target.value.replace(/(^0+)/, '').replace(/,/g, '')
    if (priceTxt === '' || Number.isNaN(Number(priceTxt))) initialInput()
    else {
      setPrice(comma(priceTxt))
      setAmount((Number(priceTxt) / btc.krw).toFixed(commaLength).toString())
    }
  }, [])

  const handlePriceKeydown = useCallback(() => {
    if (standard) return
    chkRef.current?.classList.add('done')
    setTimeout(() => {
      chkRef.current?.classList.remove('done')
    }, 1000)
  }, [])

  // 잘 못 의도된 키 다운 이벤트 체크박스 애니메이션 효과
  const handleAmountKeydown = useCallback(() => {
    if (!standard) return
    chkRef.current?.classList.add('done')
    setTimeout(() => {
      chkRef.current?.classList.remove('done')
    }, 1000)
  }, [])

  const toggleStandard = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStandard(e.target.checked)
  }, [])

  // 생태계별 표시
  const findEcoSystem = useCallback(() => {
    const numAmt = Number(amount.replace(/[^\d.]/g, ''))
    const me = ecoSystemPyramid.find((eco) => numAmt === 0 || (numAmt >= eco.min && eco.max > numAmt))
    if (me) setEmoji(me.emoji)
  }, [amount])

  // 생태계 모달 오픈
  const onEco = useCallback(() => {
    setEco(true)
  }, [])

  useEffect(() => {
    if (numReg.test(amount)) {
      const calcSat = (Number(amount) * satoshi).toFixed(0).toString()
      setSat(comma(calcSat))
      findEcoSystem()
      return
    }
    setSat('0')
  }, [amount])

  // 실시간 가격 변동 시 인풋 박스에 반영
  useEffect(() => {
    if (standard) {
      // 금액
      const numPrice = Number(price.replace(/(^0+)/, '').replace(/,/g, ''))
      const calcAmount = (numPrice / btc.krw).toFixed(commaLength).toString()
      setAmount(calcAmount)
    } else {
      // 개수
      const numAmount = Number(amount.replace(/(^0+)/, '').replace(/,/g, ''))
      setPrice(calcPrice(numAmount))
    }
  }, [btc])

  return (
    <WidgetFrame id="btcKrw" icon={<BiTransferAlt fontSize={28} color={btcInfo.color} />} title="BTC/KRW">
      <Stack gap="24px">
        <Stack direction="row" justifyContent="space-between" alignItems="center" useFlexGap flexWrap="wrap">
          <FormGroup ref={chkRef} sx={{ userSelect: 'none' }}>
            <FormControlLabel control={<Checkbox checked={standard} onChange={toggleStandard} />} label="가격 기준" />
          </FormGroup>
          {/* 생태계 이모지 */}
          {isEcoSystem && (
            <Typography fontSize={28} width={40} onClick={onEco} sx={{ cursor: 'pointer' }}>
              {emoji}
            </Typography>
          )}
        </Stack>

        <Stack direction={standard ? 'column-reverse' : 'column'} justifyContent="center" gap={1} height="calc(100% - 85px)">
          <FormControl fullWidth>
            <InputLabel htmlFor="outlined-adornment-amount">BitCoin</InputLabel>
            <OutlinedInput
              id="outlined-adornment-amount"
              label="Amount"
              className="crypto-input"
              readOnly={standard}
              value={amount}
              type="number"
              slotProps={{ input: { min: 0, step: 0.1, inputMode: 'decimal', pattern: '[0-9]+([.,]0|[1-9]+)?' } }}
              onChange={!isSafari ? handleAmount : iosHandleAmount}
              onKeyDown={handleAmountKeydown}
              startAdornment={
                <InputAdornment position="start">
                  <BtcIcon size={36} />
                </InputAdornment>
              }
              endAdornment={<CopyButton txt={amount} />}
            />
          </FormControl>

          <Stack alignItems="flex-end">
            <Stack flexDirection="row" alignItems="center">
              <CopyButton txt={sat} />
              {sat}
              <span className="unit-txt">Sat</span>
              <Stack flexDirection="row" alignItems="center">
                &#40;
                <SatIcon width={20} height={20} />
                &#41;
              </Stack>
            </Stack>
          </Stack>

          <FormControl fullWidth>
            <InputLabel htmlFor="outlined-adornment-amount">KRW</InputLabel>
            <OutlinedInput
              id="outlined-adornment-amount"
              label="Amount"
              className="price-input"
              readOnly={!standard}
              value={price}
              onChange={handlePrice}
              onKeyDown={handlePriceKeydown}
              startAdornment={
                <InputAdornment position="start">
                  <Stack justifyContent="center" alignItems="center" width="36px">
                    <KrwIcon size={20} />
                  </Stack>
                </InputAdornment>
              }
              endAdornment={<CopyButton txt={price} />}
            />
          </FormControl>
        </Stack>
      </Stack>
      <EcoSystemDialog open={isEco} setOpen={setEco} />
    </WidgetFrame>
  )
}

export default BtcToKrw
