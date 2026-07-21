import type { ReactNode } from "react";
import { BlockIcon, DashboardIcon, ExchangeIcon, PillIcon, PremiumIcon } from "@/shared/ui/icon";

interface ClientRoute {
  title: string;
  subtitle?: string;
  path: string;
  isNav: boolean;
  isFavorite: boolean;
  icon: ReactNode;
  replace?: string;
  hideHeader?: boolean;
  hideBottomNav?: boolean;
}

/** 전환 방향은 이 배열의 인덱스 순서로 결정되므로, 하위 페이지는 상위 경로 뒤에 둔다. */
const clientRoutes: ClientRoute[] = [
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
    title: "Halving Countdown",
    path: "/blocks/countdown",
    isNav: false,
    isFavorite: false,
    icon: null,
    hideHeader: true,
    hideBottomNav: true,
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
    subtitle: "Orange",
    path: "/orange-pill",
    isNav: true,
    isFavorite: true,
    icon: <PillIcon size={20} />,
  },
  { title: "DCA", path: "/dca", isNav: false, isFavorite: false, icon: null },
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
  {
    title: "Privacy Policy",
    path: "/settings/privacy",
    isNav: false,
    isFavorite: false,
    icon: null,
  },
];

export const allRouteList = clientRoutes.filter(({ title, ...restProps }) => restProps);
export const favoriteRouteList = clientRoutes.filter(
  ({ title, isFavorite, ...restProps }) => isFavorite && restProps,
);
export const navigationRouteList = clientRoutes.filter(
  ({ title, isNav, ...restProps }) => isNav && restProps,
);

/** 헤더를 렌더링하지 않을 경로 목록 */
export const hideHeaderPathList = clientRoutes
  .filter(({ hideHeader }) => hideHeader)
  .map(({ path }) => path);

/** 하단 네비게이션을 렌더링하지 않을 경로 목록 */
export const hideBottomNavPathList = clientRoutes
  .filter(({ hideBottomNav }) => hideBottomNav)
  .map(({ path }) => path);

export default { allRouteList, favoriteRouteList, navigationRouteList };
