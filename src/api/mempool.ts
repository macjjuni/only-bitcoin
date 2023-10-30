import axios from 'axios'

const apiUrl = 'https://mempool.space/api/v1/blocks'

export const getBtcRecentBlockHeight = async (): Promise<{ height: number; timeStamp: number }> => {
  const { data } = await axios.get(apiUrl)
  return { height: data[0].height, timeStamp: data[0].timestamp }
}
