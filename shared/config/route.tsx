import { BlockIcon, DashboardIcon, ExchangeIcon, PillIcon, PremiumIcon } from '@/components/ui/icon'

const clientRoutes = [
  { title: 'Overview', path: '/', isNav: false, isFavorite: false, icon: <DashboardIcon size={32}/> },
  { title: 'Overview', path: '/overview', isNav: true, isFavorite: true, icon: <DashboardIcon size={32}/> },
  { title: 'Blocks', path: '/blocks', isNav: true, isFavorite: true, icon: <BlockIcon size={32}/> },
  { title: 'BTC To Fiat', path: '/btc2fiat', isNav: true, isFavorite: true, icon: <ExchangeIcon size={34}/> },
  { title: 'Premium', path: '/premium', isNav: true, isFavorite: true, icon: <PremiumIcon size={30}/> },
  { title: 'Orange Pill', path: '/orange-pill', isNav: true, isFavorite: true, icon: <PillIcon size={30}/> },
  { title: 'BIP39', path: '/orange-pill/bip39', isNav: false, isFavorite: false, icon: null },
  { title: 'Meme', path: '/orange-pill/meme', isNav: false, isFavorite: false, icon: null },
  { title: 'Meme_temp', path: '/meme', replace: '/orange-pill/meme', isNav: false, isFavorite: false, icon: null },
  { title: '404 - Not Found', path: '/*', isNav: false, isFavorite: false, icon: null },
  { title: 'Settings', path: '/settings', isNav: false, isFavorite: false, icon: null },
]

export const allRouteList = clientRoutes.filter(({ title, ...restProps }) => restProps)
export const favoriteRouteList = clientRoutes.filter(({ title, isFavorite, ...restProps }) => isFavorite && restProps)
export const navigationRouteList = clientRoutes.filter(({ title, isNav, ...restProps }) => isNav && restProps)

export default { allRouteList, favoriteRouteList, navigationRouteList }
