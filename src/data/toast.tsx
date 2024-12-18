import { Flip, ToastContainerProps } from "react-toastify";
import { FaBitcoin } from "react-icons/fa";
import { btcInfo } from "@/data/btcInfo";
import "@/styles/toastify.scss";

export const toastProps: () => ToastContainerProps = () => {
  const width = window.innerWidth || document.body.clientWidth;
  const position = width > 600 ? "top-right" : "bottom-center";

  return {
    position,
    transition: Flip,
    autoClose: 1500,
    hideProgressBar: false,
    newestOnTop: false,
    closeOnClick: true,
    rtl: false,
    pauseOnFocusLoss: true,
    draggable: true,
    pauseOnHover: false,
    icon: () => <FaBitcoin fontSize={28} fill={btcInfo.color} />
  };
};
