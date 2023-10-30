import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import MvrvPage from '@/pages/Mvrv'
import Having from '@/pages/Having'
import Error from '@/pages/Error'
import App from '@/App'

interface IRoute {
  id?: number
  title: string
  path: string
  component: React.ReactNode
}

export const routes: IRoute[] = [
  { id: 0, title: 'BTC2KRW', path: '/', component: <Home /> },
  { id: 1, title: '반감기', path: '/having', component: <Having /> },
  { id: 2, title: 'MVRV Z-SCORE', path: '/mvrv', component: <MvrvPage /> },
]

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      {routes.map((route) => (
        <Route key={route.id} path={route.path} element={route.component} />
      ))}
      <Route path="/*" element={<Error />} />
    </Route>
  )
)

export default router
