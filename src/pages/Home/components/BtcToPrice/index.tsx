import { useEffect, useState, useRef } from 'react'
import { Stack, FormGroup, FormControlLabel, Checkbox, FormControl, InputLabel, OutlinedInput, InputAdornment } from '@mui/material'
import { FaWonSign } from 'react-icons/fa'
import { toast } from 'react-toastify'
import CopyButton from '@/components/CopyButton'
import { useBearStore } from '@/zustand/store'
import { btcInfo } from '@/data/btcInfo'
import { comma, isSafari } from '@/utils/common'

const numReg = /^[-+]?(\d+(\.\d*)?|\.\d+)$/
const commaLength = 5 // 소숫점
const satoshi = 100000000

const BtcToPrice = () => {
  // zustand Store
  const btc = useBearStore((state) => state.btc)
  const amount = useBearStore((state) => state.amount)
  const setAmount = useBearStore((state) => state.setAmount)
  // state
  const [standard, setStandard] = useState(false) // 기준 : 개수(false) or 가격(false)
  const [price, setPrice] = useState('0') // 금액
  const [sat, setSat] = useState('0')
  // ref
  const chkRef = useRef<HTMLDivElement>(null)
  const amountRef = useRef<HTMLInputElement | null>(null)
  const priceRef = useRef<HTMLInputElement | null>(null)

  // 인풋 초기화
  const initialInput = () => {
    setAmount('0')
    setPrice('0')
    setSat('0')
  }

  const calcPrice = (amt: number) => {
    return comma((btc.priceKRW * Number(amt)).toFixed(0).toString())
  }

  // 비트코인 개수 변경
  const handleAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amountTxt = e.target.value
    if (amountTxt === '' || amountTxt === '0') setAmount('0')
    else {
      const cleanNum = amountTxt.replace(/^0+/, '')
      if (cleanNum.charAt(0) === '.') setAmount(`0${cleanNum}`)
      else setAmount(cleanNum)
      setPrice(calcPrice(Number(amountTxt)))
    }
  }
  // IOS 전용
  const iosHandleAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amountTxt = e.target.value
    setAmount(amountTxt)
    setPrice(calcPrice(Number(amountTxt)))
  }

  // 원화 금액 변경
  const handlePrice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const priceTxt = e.target.value.replace(/(^0+)/, '').replace(/,/g, '')
    if (priceTxt === '' || Number.isNaN(Number(priceTxt))) initialInput()
    else {
      setPrice(comma(priceTxt))
      setAmount((Number(priceTxt) / btc.priceKRW).toFixed(commaLength).toString())
    }
  }

  const handlePriceKeydown = () => {
    if (standard) return
    chkRef.current?.classList.add('done')
    setTimeout(() => {
      chkRef.current?.classList.remove('done')
    }, 1000)
  }

  const handleAmountKeydown = () => {
    if (!standard) return
    chkRef.current?.classList.add('done')
    setTimeout(() => {
      chkRef.current?.classList.remove('done')
    }, 1000)
  }

  const toggleStandard = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStandard(e.target.checked)
  }

  useEffect(() => {
    if (numReg.test(amount)) {
      const calcSat = (Number(amount) * satoshi).toFixed(0).toString()
      setSat(comma(calcSat))
      return
    }
    setSat('0')
  }, [amount])

  // 실시간 가격 변동 시 인풋 박스에 반영
  useEffect(() => {
    if (standard) {
      // 금액
      const numPrice = Number(price.replace(/(^0+)/, '').replace(/,/g, ''))
      const calcAmount = (numPrice / btc.priceKRW).toFixed(commaLength).toString()
      setAmount(calcAmount)
    } else {
      // 개수
      const numAmount = Number(amount.replace(/(^0+)/, '').replace(/,/g, ''))
      setPrice(calcPrice(numAmount))
    }
  }, [btc])

  return (
    <>
      <Stack direction="row" useFlexGap flexWrap="wrap" paddingBottom="1rem">
        <FormGroup ref={chkRef} sx={{ userSelect: 'none' }}>
          <FormControlLabel control={<Checkbox checked={standard} onChange={toggleStandard} />} label="가격 기준" />
        </FormGroup>
      </Stack>

      <Stack spacing={3} direction={standard ? 'column-reverse' : 'column'}>
        <FormControl fullWidth>
          <InputLabel htmlFor="outlined-adornment-amount">BitCoin</InputLabel>
          <OutlinedInput
            inputRef={amountRef}
            id="outlined-adornment-amount"
            label="Amount"
            className="crypto-input"
            readOnly={standard}
            value={amount}
            type="number"
            slotProps={{ input: { min: 0, step: 0.1, inputMode: 'decimal', pattern: '[0-9]+([.,]0|[1-9]+)?' } }}
            onChange={!isSafari ? handleAmount : iosHandleAmount}
            onKeyDown={handleAmountKeydown}
            startAdornment={<InputAdornment position="start">{btcInfo.icon}</InputAdornment>}
            endAdornment={<CopyButton txt={amount} />}
          />
          <Stack alignItems="flex-end" pt="8px">
            <div>
              {sat}
              <span className="unit-txt">Sat</span>
            </div>
          </Stack>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel htmlFor="outlined-adornment-amount">KRW</InputLabel>
          <OutlinedInput
            inputRef={priceRef}
            id="outlined-adornment-amount"
            label="Amount"
            className="price-input"
            readOnly={!standard}
            value={price}
            onChange={handlePrice}
            onKeyDown={handlePriceKeydown}
            startAdornment={
              <InputAdornment position="start">
                <FaWonSign size="28" />
              </InputAdornment>
            }
            endAdornment={<CopyButton txt={price} />}
          />
        </FormControl>
      </Stack>
    </>
  )
}

export default BtcToPrice
