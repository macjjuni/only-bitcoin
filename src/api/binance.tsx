import moment from 'moment'
import { useBearStore } from '@/zustand/store'
import { binaceAsset } from '@/data/btcInfo'
// Binance API URL
const binanceURL = `wss://stream.binance.com:9443/ws/${binaceAsset[0]}@ticker`

// Zustand
const { getState } = useBearStore

let timeoutId: ReturnType<typeof setInterval>
let retryCount = 1
const limitCount = 3
const intervalTime = 3000 // ms 재시도 시간 간격

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
  }
  socket.onmessage = ({ data }) => {
    const json = JSON.parse(data)
    const priceUSD = Number(json.c) // 현재 가격
    const time = moment(json.C).format('YYYY-MM-DD HH:mm:ss')
    getState().updateUSD({ priceUSD, time }) // store update
  }

  socket.onerror = (e) => {
    if (socket === null) return
    console.log('on error!')
    socket.close()
    console.error(e)
  }
  socket.onclose = () => {
    console.log('socket close')
    // toast.info(`서버 연결이 해제되었습니다. ${intervalTime / 1000}초 후 재연결 시도합니다.`)

    timeoutId = setInterval(() => {
      if (retryCount > limitCount) {
        clearInterval(timeoutId)
        return
      }
      initBinance()
    }, intervalTime)
  }
}
// 접속 해제
export const disconnect = () => {
  if (!socket) return
  socket.close()
}

export default initBinance
