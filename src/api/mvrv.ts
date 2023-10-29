import axios from 'axios'

export interface IMvrvValue {
  val: string
  date: string
}

export interface IMvrv {
  src: string
  mvrv: IMvrvValue
}

const apuUrl = import.meta.env.VITE_MVRV_URL || ''

export const getMVRVImage = async () => {
  const { data } = await axios.get<IMvrv>(`${apuUrl}/image/mvrv`)
  return data
}
