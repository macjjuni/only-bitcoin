import { useEffect, useState, useRef } from 'react'
import { Stack, FormGroup, FormControlLabel, Checkbox, FormControl, InputLabel, OutlinedInput, InputAdornment } from '@mui/material'
import { btcInfo } from '@/data/crypto'
import { comma } from '@/utils/common'
import SatIcon from '@/components/SatIcon'
import CopyButton from '@/components/CopyButton'

const flag = 100000000

const BtcToSat = () => {
  // state
  const [standard, setStandard] = useState(false) // 기준 : 개수(false) or 가격(false)
  const [amount, setAmount] = useState('0')
  const [sat, setPrice] = useState('0') // 금액
  // ref
  const chkRef = useRef<HTMLDivElement>(null)
  const satRef = useRef<HTMLInputElement | null>(null)
  const btcRef = useRef<HTMLInputElement | null>(null)
  // zustand Store

  const initialInput = () => {
    setAmount('0')
    setPrice('0')
  }

  const handleAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amountTxt = e.target.value
    console.log(amountTxt)
    const reAmtTxt = amountTxt.replace(/(^0+)/, '')
    if (Number(amountTxt) < 0 || amountTxt === '') initialInput()
    else if (reAmtTxt === '') setAmount('0')
    else if (reAmtTxt.includes('.')) setAmount(`0${reAmtTxt}`)
    else setAmount(reAmtTxt)
    const calcSats = (Number(amountTxt) * flag).toFixed(0)
    setPrice(comma(calcSats.toString()))
  }

  // 금액 변경
  const handlePrice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const priceTxt = e.target.value.replace(/(^0+)/, '').replace(/,/g, '')
    if (priceTxt === '' || Number.isNaN(Number(priceTxt))) initialInput()
    else {
      setPrice(comma(priceTxt))
      setAmount((Number(priceTxt) / flag).toString())
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
    if (!standard) satRef.current?.focus()
    else btcRef.current?.focus()
  }

  useEffect(() => {
    focusInput()
  }, [standard])

  return (
    <>
      <Stack direction="row" useFlexGap flexWrap="wrap" paddingBottom="1rem">
        <FormGroup ref={chkRef} sx={{ userSelect: 'none' }}>
          <FormControlLabel control={<Checkbox checked={standard} onChange={toggleStandard} />} label="사토시 기준" />
        </FormGroup>
      </Stack>

      <Stack spacing={4} direction={standard ? 'column-reverse' : 'column'}>
        <FormControl fullWidth>
          <InputLabel htmlFor="outlined-adornment-amount">BitCoin</InputLabel>
          <OutlinedInput
            inputRef={satRef}
            id="outlined-adornment-amount"
            label="Amount"
            className="crypto-copy-input"
            readOnly={standard}
            value={amount}
            type="number"
            slotProps={{ input: { min: 0, step: 0.000001 } }}
            onClick={focusInput}
            onChange={handleAmount}
            onKeyDown={handleAmountKeydown}
            startAdornment={<InputAdornment position="start">{btcInfo.icon}</InputAdornment>}
            endAdornment={
              <InputAdornment position="end">
                <CopyButton />
              </InputAdornment>
            }
          />
        </FormControl>

        <FormControl fullWidth>
          <InputLabel htmlFor="outlined-adornment-amount">Satoshi</InputLabel>
          <OutlinedInput
            inputRef={btcRef}
            id="outlined-adornment-amount"
            className="price-copy-input"
            readOnly={!standard}
            value={sat}
            onClick={focusInput}
            onChange={handlePrice}
            onKeyDown={handlePriceKeydown}
            startAdornment={
              <InputAdornment position="start">
                <SatIcon />
              </InputAdornment>
            }
            endAdornment={
              <InputAdornment position="end">
                <CopyButton />
              </InputAdornment>
            }
            label="Amount"
          />
        </FormControl>
      </Stack>
    </>
  )
}

export default BtcToSat
