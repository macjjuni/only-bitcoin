import { toast } from 'react-toastify'
import { useBearStore } from '@/zustand/store'
import { binaceAsset } from '@/data/btcInfo'
import { isNetwork, transDate, getNowDate } from '@/utils/common'

// Binance API URL
const binanceURL = `wss://stream.binance.com:9443/ws/${binaceAsset[0]}@ticker`

// Zustand
const { getState } = useBearStore
// Store data reset
const resetData = () => {
  const usdTime = getNowDate()
  getState().updateUSD({ usd: 0, usdTime }) // store update
}

let timeout: NodeJS.Timeout | null = null
let retryCount = 1
const limitCount = 3
const setTime = 3000 // ms 재시도 시간 간격

const clearTimeOut = () => {
  if (!timeout) return
  clearTimeout(timeout)
  timeout = null
}
/**
 * --- TODO LIST ---
 *
 */

// 소켓 생성
let socket: WebSocket | null = null

// 소켓 초기화
function initBinance() {
  socket = new WebSocket(binanceURL)

  // eslint-disable-next-line func-names
  socket.onopen = function () {
    console.log('on socket_Binance')
    retryCount = 1
    toast.success(`서버에 연결되었습니다.(Binance) 2,100만 하세요⚡️`)
  }
  socket.onmessage = ({ data }) => {
    const json = JSON.parse(data)
    const usd = Number(json.c) // 현재 가격
    const usdTime = transDate(json.C)
    getState().updateUSD({ usd, usdTime }) // store update
  }

  // 소켓 에러 핸들링
  socket.onerror = (e) => {
    console.dir(e)

    if (socket === null) return
    if (!isNetwork()) {
      toast.warn(`인터넷 연결 오류 또는 서버 점검 중입니다. 나중에 다시 시도해주세요 🙏`)
      socket.close()
    }
  }

  // 소켓 닫힘
  socket.onclose = (e) => {
    console.dir(`비정상적 종료(Binance): ${e.code}`)
    if (e.wasClean || e.code === 1000) {
      toast.info(`서버 연결 해제(Binance)`)
    } else if (e.code === 1006) {
      // 비정상적 오류
      timeout = setTimeout(() => {
        toast.info(`${setTime / 1000}초 후 재연결 시도합니다. (${retryCount++})`)
        if (retryCount > limitCount) {
          // 제한 횟숨만큼 연결 재시도
          clearTimeOut()
          toast.error(`서버가 응답하지 않습니다. 나중에 다시 시도해주세요 🙏`)
        } else {
          initBinance()
        }
      }, setTime)
    }
  }
}
// 접속 해제
export const disconnect = () => {
  if (!socket) return
  resetData()
  socket.close(1000)
}

export default initBinance
