import { ThemeProvider } from "@mui/material/styles";
import { ToastContainer } from "react-toastify";

import CssBaseline from "@mui/material/CssBaseline";
import { useCallback, useLayoutEffect } from "react";
import { Header, Main, Footer } from "@/layout";
import Initializer from "./components/initial/Initializer";

import { darkTheme, lightTheme } from "./styles/theme";
import { useBearStore } from "@/store";
import { toastProps } from "@/data/toast";

import "react-toastify/dist/ReactToastify.css";
import "@/styles/index.scss";

const App = () => {
  // 소켓 초기화
  const theme = useBearStore((state) => state.theme);

  const initialTheme = useCallback(() => {
    const body = document.getElementsByTagName("body");

    if (theme === "dark") {
      body[0].classList.add("dark");
    } else {
      body[0].classList.remove("dark");
    }
  }, [theme]);

  useLayoutEffect(() => {
    initialTheme();
  }, [theme]);

  return (
    <Initializer>
      <ThemeProvider theme={theme === "light" ? lightTheme : darkTheme}>
        <div id="only-bitcoin">
          <CssBaseline />
          <Header />
          <Main />
          <Footer />
          <ToastContainer {...toastProps()} />
        </div>
      </ThemeProvider>
    </Initializer>
  );
};

export default App;
