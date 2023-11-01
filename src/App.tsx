import { Outlet } from 'react-router'
import { ThemeProvider } from '@mui/material/styles'
import { ToastContainer } from 'react-toastify'

import CssBaseline from '@mui/material/CssBaseline'
import Header from '@/layout/header'
import Main from '@/layout/main'
import Footer from '@/layout/footer'
import GoogleGA from './components/init/GoogleGA'
import AdsenseCodeSnippet from './components/init/AdSenseCodeSnippet'
import BlockHeight from './components/init/BlockHeight'

import { darkTheme, lightTheme } from './styles/theme'
import { useBearStore } from './zustand/store'
import { toastProps } from '@/data/toast'

const toastOptions = toastProps()
const isDev = import.meta.env.MODE === 'development'

const App = () => {
  const theme = useBearStore((state) => state.theme)
  GoogleGA()
  return (
    <ThemeProvider theme={theme === 'light' ? lightTheme : darkTheme}>
      {!isDev && <AdsenseCodeSnippet />}
      <BlockHeight />
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
  )
}

export default App
