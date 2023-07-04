import ReactDOM from 'react-dom/client'
import '@/styles/index.css'

import CssBaseline from '@mui/material/CssBaseline'
import { ToastContainer } from 'react-toastify'
import { toastProps } from '@/data/toast'
import App from '@/App'

import 'react-toastify/dist/ReactToastify.css'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
const toastOptions = toastProps()

root.render(
  <>
    <ToastContainer {...toastOptions} />
    <CssBaseline />
    <App />
  </>
)
