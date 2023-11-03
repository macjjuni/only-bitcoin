import axios from 'axios'
import { toast } from 'react-toastify'
import { bearStore } from '@/store'

// mvrv 데이터 타입(이미지 제외)
export interface IMvrvValue {
  val: string
  date: string
}

// API로 조회한 객체 인터페이스(이미지 포함)
export interface IMvrv {
  src: string
  mvrv: IMvrvValue
}

const apuUrl = import.meta.env.VITE_MVRV_URL || ''
const mvrvStorageKey = 'mvrv'

export const getMVRVImage = async () => {
  try {
    const { data } = await axios.get<IMvrv>(`${apuUrl}/image/mvrv`)
    if (data.src === 'error') throw Error('src is error string')
    window?.localStorage.setItem(mvrvStorageKey, `data:image/webp;base64, ${data.src}`) // 로걸 스토리지에 저장
    bearStore.setMvrv({
      value: data.mvrv.val,
      date: data.mvrv.date,
      timeStamp: new Date().getTime(), // 저장된 타임스탬프값 저장
    })
  } catch (err) {
    console.error(err)
    toast.error('MVRV 데이터를 조회할 수 없습니다.')
  }
}

export const getStorageMvrvImage = () => window?.localStorage.getItem(mvrvStorageKey) || ''
