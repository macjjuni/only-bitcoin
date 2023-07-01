import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import CssBaseline from '@mui/material/CssBaseline'
import { ToastContainer, Flip } from 'react-toastify'

import ReactDOM from 'react-dom/client'
import '@/styles/index.css'
import App from '@/App'

import 'react-toastify/dist/ReactToastify.css'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <>
    <ToastContainer position="top-right" transition={Flip} autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover={false} />
    <CssBaseline />
    <App />
  </>
)
