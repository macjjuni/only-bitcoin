import axios from 'axios'
import { transTimeStampDate } from '@/utils/common'

const apiUrl = 'https://mempool.space/api/v1/blocks'

export const getBtcRecentBlockHeight = async (): Promise<{ height: number; date: string }> => {
  const { data } = await axios.get(apiUrl)
  return { height: data[0].height, date: transTimeStampDate(data[0].timestamp) }
}
