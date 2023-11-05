import { toast } from 'react-toastify'

export const mvrvToast = {
  success: () => {
    toast.success('MVRV 데이터 업데이트!')
  },
  error: () => {
    toast.error('MVRV 데이터를 조회할 수 없습니다.')
  },
}
