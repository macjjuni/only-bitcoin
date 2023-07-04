import ReactDOM from 'react-dom/client'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import '@/styles/index.css'

import CssBaseline from '@mui/material/CssBaseline'
import { ToastContainer } from 'react-toastify'
import { toastProps } from '@/data/toast'
import App from '@/App'

import 'react-toastify/dist/ReactToastify.css'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <>
    <ToastContainer {...toastProps} />
    <CssBaseline />
    <App />
  </>
)
