import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react'
import { Stack, FormGroup, FormControlLabel, Checkbox, FormControl, InputLabel, OutlinedInput, InputAdornment } from '@mui/material'
import { FaWonSign } from 'react-icons/fa'
import { useBearStore } from '@/zustand/store'
import { btcInfo } from '@/data/crypto'
import { comma } from '@/utils/common'

const commaLength = 5 // 소숫점
const saveKey = 'btc-amount'

const BtcToPrice = () => {
  // state
  const [standard, setStandard] = useState(false) // 기준 : 개수(false) or 가격(false)
  const [price, setPrice] = useState('0') // 금액
  // ref
  const chkRef = useRef<HTMLDivElement>(null)
  const amountRef = useRef<HTMLInputElement | null>(null)
  const priceRef = useRef<HTMLInputElement | null>(null)
  // zustand Store
  const btc = useBearStore((state) => state.btc)
  const amount = useBearStore((state) => state.amount)
  const setAmount = useBearStore((state) => state.setAmount)

  const initialInput = () => {
    setAmount('0')
    setPrice('0')
  }

  const handleAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amountTxt = e.target.value
    const reAmtTxt = amountTxt.replace(/(^0+)/, '')
    if (Number(amountTxt) < 0 || amountTxt === '') initialInput()
    else if (reAmtTxt === '') setAmount('0')
    else {
      if (reAmtTxt.includes('.')) setAmount(`0${reAmtTxt}`)
      else setAmount(reAmtTxt)
      const totalPrice = (btc.price * Number(amountTxt)).toFixed(0).toString()
      setPrice(comma(totalPrice))
    }
  }

  // 금액 변경
  const handlePrice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const priceTxt = e.target.value.replace(/(^0+)/, '').replace(/,/g, '')
    if (priceTxt === '' || Number.isNaN(Number(priceTxt))) initialInput()
    else {
      setPrice(comma(priceTxt))
      setAmount((Number(priceTxt) / btc.price).toFixed(commaLength).toString())
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

  const focusInput = () => {
    if (!standard) amountRef.current?.focus()
    else priceRef.current?.focus()
  }

  useEffect(() => {
    focusInput()
  }, [standard])

  // 실시간 가격 변동 시 인풋 박스에 반영
  useEffect(() => {
    if (standard) {
      // 금액
      const numPrice = Number(price.replace(/(^0+)/, '').replace(/,/g, ''))
      const calcAmount = (numPrice / btc.price).toFixed(commaLength).toString()
      setAmount(calcAmount)
    } else {
      // 개수
      const numAmount = Number(amount.replace(/(^0+)/, '').replace(/,/g, ''))
      const calcPrice = (numAmount * Number(btc.price)).toFixed(0)
      setPrice(comma(calcPrice))
    }
  }, [btc])

  return (
    <>
      <Stack direction="row" useFlexGap flexWrap="wrap" paddingBottom="1rem">
        <FormGroup ref={chkRef} sx={{ userSelect: 'none' }}>
          <FormControlLabel control={<Checkbox checked={standard} onChange={toggleStandard} />} label="가격 기준" />
        </FormGroup>
      </Stack>

      <Stack spacing={4} direction={standard ? 'column-reverse' : 'column'}>
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
            slotProps={{ input: { min: 0, step: 0.1 } }}
            onClick={focusInput}
            onChange={handleAmount}
            onKeyDown={handleAmountKeydown}
            startAdornment={<InputAdornment position="start">{btcInfo.icon}</InputAdornment>}
          />
        </FormControl>

        <FormControl fullWidth>
          <InputLabel htmlFor="outlined-adornment-amount">KRW</InputLabel>
          <OutlinedInput
            inputRef={priceRef}
            id="outlined-adornment-amount"
            className="price-input"
            readOnly={!standard}
            value={price}
            onClick={focusInput}
            onChange={handlePrice}
            onKeyDown={handlePriceKeydown}
            startAdornment={
              <InputAdornment position="start">
                <FaWonSign size="28" />
              </InputAdornment>
            }
            label="Amount"
          />
        </FormControl>
      </Stack>
    </>
  )
}

export default BtcToPrice
