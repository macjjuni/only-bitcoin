import { toast } from 'react-toastify'
import { FaBitcoin } from 'react-icons/fa'
import { useBearStore } from '@/zustand/store'
import { btcInfo } from '@/data/crypto'

// Zustand
const { getState } = useBearStore

const currency = [{ ticket: 'macjjuni' }, { type: 'ticker', codes: [btcInfo.ticker] }, { format: 'SIMPLE' }]

let timeoutId: ReturnType<typeof setInterval>
let retryCount = 1
const limitCount = 3

/**
 * --- TODO LIST ---
 * 1. 업비트 점검 시 코빗이나 다른 해외 거래소 시세 받아와 연결
 * 2.
 */

// 소켓 생성
let socket: WebSocket | null = null

function initSocket() {
  // 초기 접속 실행
  socket = new WebSocket('wss://api.upbit.com/websocket/v1')
  socket.binaryType = 'arraybuffer'

  // eslint-disable-next-line func-names
  socket.onopen = function () {
    console.log('on socket')
    retryCount = 1
    this.send(JSON.stringify(currency))
    toast.success(`서버에 연결되었습니다! 2,100만 하세요⚡`, {
      icon: () => <FaBitcoin fontSize={32} color={btcInfo.color} />,
    })
    clearInterval(timeoutId)
  }
  socket.onmessage = (evt) => {
    const enc = new TextDecoder('utf-8')
    const arr = new Uint8Array(evt.data)
    const data = JSON.parse(enc.decode(arr))

    const filterData = {
      title: data.cd.split('-')[1].toLowerCase(),
      ticker: data.cd,
      price: data.tp,
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
    toast.info(`서버 연결이 해제되었습니다. 2초 후 재연결 시도합니다.`)
    setTimeout(() => {
      timeoutId = setInterval(() => {
        console.log('timeout', retryCount)
        if (retryCount > limitCount) {
          toast.warn(`인터넷 연결 오류 또는 업비트 서버 점검 중입니다. 나중에 다시 시도해주세요 🙏`)
          clearInterval(timeoutId)
          return
        }
        toast.warn(`재연결 시도 중..🏃(${retryCount++}번 시도)`)
        initSocket()
      }, 1500)
    }, 2000)
  }
}
// 접속 해제
export const disconnect = () => {
  if (!socket) return
  socket.close()
}

export default initSocket
