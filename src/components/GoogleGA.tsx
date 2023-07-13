import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ReactGA from 'react-ga4'

const GA_TRACKING_ID = import.meta.env.VITE_GA_TRAKING_ID

const GoogleGA = () => {
  const location = useLocation()
  const [initialized, setInitialized] = useState(false)

  // 개발서버는 제외
  useEffect(() => {
    if (window.location.href.includes('localhost')) return
    ReactGA.initialize(GA_TRACKING_ID)
    setInitialized(true)
  }, [])

  // location 변경시 pageview 이벤트 전송
  useEffect(() => {
    if (!initialized) return
    ReactGA.set({ page: location.pathname })
    ReactGA.send('pageview')
  }, [initialized, location])
}

export default GoogleGA
