import { Outlet } from 'react-router'
import { ThemeProvider } from '@mui/material/styles'
import { ToastContainer } from 'react-toastify'

import CssBaseline from '@mui/material/CssBaseline'
import Header from '@/layout/header'
import Main from '@/layout/main'
import Footer from '@/layout/footer'
import Initializer from './components/initial/Initializer'

import { darkTheme, lightTheme } from './styles/theme'
import { useBearStore } from './store'
import { toastProps } from '@/data/toast'

const toastOptions = toastProps()

const App = () => {
  // 소켓 초기화
  const theme = useBearStore((state) => state.theme)
  return (
    <Initializer>
      <ThemeProvider theme={theme === 'light' ? lightTheme : darkTheme}>
        <div id="only-bitcoin" className={theme}>
          <CssBaseline />
          <Header />
          <Main>
            <Outlet />
          </Main>
          <Footer />
          <ToastContainer {...toastOptions} />
        </div>
      </ThemeProvider>
    </Initializer>
  )
}

export default App
