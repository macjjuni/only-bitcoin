import { Outlet } from 'react-router'
import Header from '@/layout/header'
import Main from '@/layout/main'
import Footer from '@/layout/footer'
import GoogleGA from './components/GoogleGA'

const App = () => {
  GoogleGA()
  return (
    <div id="btc-forever">
      <Header />
      <Main>
        <Outlet />
      </Main>
      <Footer />
    </div>
  )
}

export default App
