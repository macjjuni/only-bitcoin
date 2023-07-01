import { toast } from 'react-toastify'
import { useBearStore } from '@/zustand/store'
import { btcInfo } from '@/data/crypto'

// Zustand
const { getState } = useBearStore

let retryCount = 1
const retryLimit = 5

const currency = [{ ticket: 'macjjuni' }, { type: 'ticker', codes: [btcInfo.ticker] }, { format: 'SIMPLE' }]

// 소켓 생성
const socket = new WebSocket('wss://api.upbit.com/websocket/v1')
socket.binaryType = 'arraybuffer'

const initSocket = () => {
  socket.onopen = () => {
    socket.send(JSON.stringify(currency))
    toast.success('서버 연결 성공!')
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
    // store update
    getState().update(filterData)
  }

  socket.onerror = (evt) => {
    socket.close()
    toast.error(`서버 연결 오류, ${retryCount++}시도 중...`)
    console.error(evt)
    // if (retryLimit > retryCount) socket.OPEN()
  }
}

export default initSocket
