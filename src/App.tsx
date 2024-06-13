import { ThemeProvider } from "@mui/material/styles";
import { ToastContainer } from "react-toastify";

import CssBaseline from "@mui/material/CssBaseline";
import { useCallback, useLayoutEffect } from "react";
import { Header, Main, Footer } from "@/layout";
import Initializer from "./components/initial/Initializer";

import { darkTheme } from "./styles/theme";
import { useBearStore } from "@/store";
import { toastProps } from "@/data/toast";

import "react-toastify/dist/ReactToastify.css";
import "@/styles/index.scss";

export default function App() {
  // 소켓 초기화
  const theme = useBearStore((state) => state.theme);

  const initialTheme = useCallback(() => {
    const body = document.getElementsByTagName("body");
    // 다크모드를 기본으로 설정
    // if (theme === "dark") {
    body[0].classList.add("dark");
    // } else {
    //   body[0].classList.remove("dark");
    // }
  }, [theme]);

  useLayoutEffect(() => {
    initialTheme();
  }, [theme]);

  return (
    <ThemeProvider theme={darkTheme}>
      <Initializer />
      <CssBaseline />
      <Header />
      <Main />
      <Footer />
      <ToastContainer {...toastProps()} />
    </ThemeProvider>
  );
}
