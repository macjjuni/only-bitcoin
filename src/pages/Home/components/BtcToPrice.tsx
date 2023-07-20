import { useEffect, useState, useRef } from 'react'
import { Stack, FormGroup, FormControlLabel, Checkbox, FormControl, InputLabel, OutlinedInput, InputAdornment, Accordion, AccordionSummary, AccordionDetails, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { FaWonSign } from 'react-icons/fa'

import { useBearStore } from '@/zustand/store'
import { btcInfo, ecoSystemPyramid } from '@/data/btcInfo'
import { comma, isSafari } from '@/utils/common'
import BoxItem from '@/components/Box'
import CopyButton from '@/components/CopyButton'

import EcoSystemDialog from '@/components/modal/EcoSystemDialog'

const numReg = /^[-+]?(\d+(\.\d*)?|\.\d+)$/
const commaLength = 5 // 소숫점
const satoshi = 100000000

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  }
}

const BtcToPrice = () => {
  // zustand Store
  const { btc, isShow, isEcoSystem, toggleAcc } = useBearStore((state) => state)
  const amount = useBearStore((state) => state.amount)
  const setAmount = useBearStore((state) => state.setAmount)

  // state
  const [standard, setStandard] = useState(false) // 기준 : 개수(false) or 가격(false)
  const [price, setPrice] = useState('0') // 금액
  const [sat, setSat] = useState('0')
  // - Eco System
  const [isEco, setEco] = useState(false)
  const [emoji, setEmoji] = useState('')

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

  // 가격 계산
  const calcPrice = (amt: number) => {
    return comma((btc.krw * Number(amt)).toFixed(0).toString())
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
      setAmount((Number(priceTxt) / btc.krw).toFixed(commaLength).toString())
    }
  }

  const handlePriceKeydown = () => {
    if (standard) return
    chkRef.current?.classList.add('done')
    setTimeout(() => {
      chkRef.current?.classList.remove('done')
    }, 1000)
  }

  // 잘 못 의도된 키 다운 이벤트 체크박스 애니메이션 효과
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

  // 생태계별 표시
  const findEcoSystem = () => {
    const numAmt = Number(amount.replace(/[^\d.]/g, ''))
    const me = ecoSystemPyramid.find((eco) => numAmt === 0 || (numAmt >= eco.min && eco.max > numAmt))
    if (me) setEmoji(me.emoji)
  }

  // 생태계 모달 오픈
  const onEco = () => {
    setEco(true)
  }

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

  // const [value, setValue] = useState(0)

  // const handleChange = (event: React.SyntheticEvent, newValue: number) => {
  //   event.preventDefault()
  //   setValue(newValue)
  // }

  return (
    <BoxItem>
      <Typography variant="h1" fontSize={20} fontWeight="bold" align="left" pb={1} mb={1} borderBottom="1px solid #cbcbcb">
        BTC/KRW
      </Typography>
      <Stack direction="row" justifyContent="space-between" alignItems="center" useFlexGap flexWrap="wrap" paddingBottom="1rem">
        <FormGroup ref={chkRef} sx={{ userSelect: 'none' }}>
          <FormControlLabel control={<Checkbox checked={standard} onChange={toggleStandard} />} label="가격 기준" />
        </FormGroup>

        <div>
          {isEcoSystem && (
            <Typography fontSize={28} width={40} onClick={onEco} sx={{ cursor: 'pointer' }}>
              {emoji}
            </Typography>
          )}
        </div>
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
            startAdornment={<InputAdornment position="start">{btcInfo.icon(36)}</InputAdornment>}
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
                <Stack justifyContent="center" alignItems="center" width="36px">
                  <FaWonSign size="20" color="#483C32" />
                </Stack>
              </InputAdornment>
            }
            endAdornment={<CopyButton txt={price} />}
          />
        </FormControl>
      </Stack>
      <EcoSystemDialog open={isEco} setOpen={setEco} />
    </BoxItem>
  )
}

export default BtcToPrice
