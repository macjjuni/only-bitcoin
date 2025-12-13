import { KIcon } from "kku-ui";
import { ToastOptions, Flip } from "react-toastify";

export const toastOptions: ToastOptions = {
  className: 'only-btc__toastify',
  theme: 'dark',
  autoClose: 1600,
  position: 'top-right',
  hideProgressBar: true,
  transition: Flip,
  closeOnClick: true,
  icon: ({type}) => {
    if (type === 'success') {
      return (<KIcon icon="confirm" className="confirm__icon" />);
    }
    if (type === 'error') {
      return (<KIcon icon="close" className="error__icon" />);
    }
    if (type === 'info') {
      return (<KIcon icon="block" className="block__icon" />);
    }
  }
}