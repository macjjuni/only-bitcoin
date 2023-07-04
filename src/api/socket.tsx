import { toast } from 'react-toastify'
import moment from 'moment'
import { useBearStore } from '@/zustand/store'
import { btcInfo } from '@/data/btcInfo'
import { uuid } from '@/utils/common'

// Upbit API URL
const upbitURL = import.meta.env.VITE_UPBIT_API_URL || 'wss://api.upbit.com/websocket/v1'

// Zustand
const { getState } = useBearStore

// Uuid
const isUuid = uuid.getUuid()
if (!isUuid) {
  const newUuid = uuid.generate()
  uuid.saveUuid(newUuid)
}
const currency = [{ ticket: uuid.getUuid() }, { type: 'ticker', codes: [btcInfo.ticker] }, { format: 'SIMPLE' }]

let timeoutId: ReturnType<typeof setInterval>
let retryCount = 1
const limitCount = 3
const intervalTime = 3000 // ms 재시도 시간 간격

/**
 * --- TODO LIST ---
 * 1. 업비트 점검 시 코빗이나 다른 해외 거래소 시세 받아와 연결
 * 2.
 */

// 소켓 생성
let socket: WebSocket | null = null

// 소켓 초기화
function initSocket() {
  socket = new WebSocket(upbitURL)
  socket.binaryType = 'arraybuffer'

  // eslint-disable-next-line func-names
  socket.onopen = function () {
    console.log('on socket')
    retryCount = 1
    this.send(JSON.stringify(currency))
    toast.success(`서버에 연결되었습니다! 2,100만 하세요⚡`)
    clearInterval(timeoutId)
  }
  socket.onmessage = (evt) => {
    const enc = new TextDecoder('utf-8')
    const arr = new Uint8Array(evt.data)
    const data = JSON.parse(enc.decode(arr))

    const filterData = {
      title: data.cd.split('-')[1].toLowerCase(),
      ticker: data.cd,
      priceKRW: data.tp,
      time: moment(data.ttms).format('YYYY-MM-DD HH:mm:ss'),
    }
    getState().update(filterData) // store update
  }

  socket.onerror = (e) => {
    if (socket === null) return
    console.log('on error!')
    socket.close()
    console.error(e)
  }
  socket.onclose = () => {
    console.log('socket close')
    toast.info(`서버 연결이 해제되었습니다. ${intervalTime / 1000}초 후 재연결 시도합니다.`)

    timeoutId = setInterval(() => {
      console.log('timeout', retryCount)
      if (retryCount > limitCount) {
        toast.warn(`인터넷 연결 오류 또는 업비트 서버 점검 중입니다. 나중에 다시 시도해주세요 🙏`)
        clearInterval(timeoutId)
        return
      }
      toast.warn(`재연결 시도 중..🏃(${retryCount++}번 시도)`)
      initSocket()
    }, intervalTime)
  }
}
// 접속 해제
export const disconnect = () => {
  if (!socket) return
  socket.close()
}

export default initSocket
