import axios from 'axios'
import { toast } from 'react-toastify'
import { IMvrvImg } from '@/pages/Mvrv'

const API_MVRV_URL = 'http://192.168.6.13:3000/api/mvrv'

export const getMvrvImage = async (): Promise<IMvrvImg> => {
  try {
    const res = await axios.get<IMvrvImg>(API_MVRV_URL)
    return res.data
  } catch (e) {
    console.error(e)
    toast.error('Bitcoin MVRV Z-Score 데이터를 가져올 수 없습니다. 나중에 다시 시도해주세요.')
    return {
      status: false,
      imgBase64: '',
      size: '0',
      date: '-',
    }
  }
}
