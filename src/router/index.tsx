import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import Error from '@/pages/Error'
import App from '@/App'

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route path="/" element={<Home />} />
      <Route path="/*" element={<Error />} />
    </Route>
  )
)

export default router
