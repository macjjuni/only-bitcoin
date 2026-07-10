import { BlockIcon, DashboardIcon, ExchangeIcon, PillIcon, PremiumIcon } from "@/shared/ui/icon";

const clientRoutes = [
  {
    title: "Overview",
    subtitle: "Overview",
    path: "/",
    isNav: false,
    isFavorite: false,
    icon: <DashboardIcon size={24} />,
  },
  {
    title: "Overview",
    subtitle: "Overview",
    path: "/overview",
    isNav: true,
    isFavorite: true,
    icon: <DashboardIcon size={24} />,
  },
  {
    title: "Blocks",
    subtitle: "Blocks",
    path: "/blocks",
    isNav: true,
    isFavorite: true,
    icon: <BlockIcon size={24} />,
  },
  {
    title: "BTC To Fiat",
    subtitle: "Convert",
    path: "/btc2fiat",
    isNav: true,
    isFavorite: true,
    icon: <ExchangeIcon size={26} />,
  },
  {
    title: "Premium",
    subtitle: "Premium",
    path: "/premium",
    isNav: true,
    isFavorite: true,
    icon: <PremiumIcon size={20} />,
  },
  {
    title: "Orange Pill",
    subtitle: "Orange Pill",
    path: "/orange-pill",
    isNav: true,
    isFavorite: true,
    icon: <PillIcon size={20} />,
  },
  { title: "BIP39", path: "/orange-pill/bip39", isNav: false, isFavorite: false, icon: null },
  { title: "Meme", path: "/orange-pill/meme", isNav: false, isFavorite: false, icon: null },
  {
    title: "Meme_temp",
    path: "/meme",
    replace: "/orange-pill/meme",
    isNav: false,
    isFavorite: false,
    icon: null,
  },
  { title: "404 - Not Found", path: "/*", isNav: false, isFavorite: false, icon: null },
  { title: "Settings", path: "/settings", isNav: false, isFavorite: false, icon: null },
];

export const allRouteList = clientRoutes.filter(({ title, ...restProps }) => restProps);
export const favoriteRouteList = clientRoutes.filter(
  ({ title, isFavorite, ...restProps }) => isFavorite && restProps,
);
export const navigationRouteList = clientRoutes.filter(
  ({ title, isNav, ...restProps }) => isNav && restProps,
);

export default { allRouteList, favoriteRouteList, navigationRouteList };
