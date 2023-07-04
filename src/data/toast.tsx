import { Flip, ToastContainerProps } from 'react-toastify'
import { FaBitcoin } from 'react-icons/fa'
import { btcInfo } from '@/data/crypto'

export const toastProps: ToastContainerProps = {
  position: 'top-right',
  transition: Flip,
  autoClose: 2000,
  hideProgressBar: false,
  newestOnTop: false,
  closeOnClick: true,
  rtl: false,
  pauseOnFocusLoss: false,
  draggable: true,
  pauseOnHover: false,
  icon: () => <FaBitcoin fontSize={32} color={btcInfo.color} />,
}
