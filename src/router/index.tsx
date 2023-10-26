import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import MvrvPage from '@/pages/Mvrv'
import Error from '@/pages/Error'
import App from '@/App'

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route path="/" element={<Home />} />
      <Route path="/mvrv" element={<MvrvPage />} />
      <Route path="/*" element={<Error />} />
    </Route>
  )
)

export default router
