// 배럴(@/shared/ui)이 아니라 아이콘 하위 배럴을 직접 가리킨다.
// @/shared/ui 는 TransitionLink 를 export 하고 TransitionLink 는 이 파일을 import 하므로,
// 배럴을 경유하면 모듈 순환이 생긴다. 이 파일은 최상위에서 JSX 를 만들기 때문에
// 평가 순서에 따라 아이콘이 undefined 인 채로 렌더될 수 있다.
import { BlockIcon, DashboardIcon, ExchangeIcon, PillIcon, PremiumIcon } from "@/shared/ui/icon";

const clientRoutes = [
  {
    title: "Overview",
    path: "/",
    isNav: false,
    isFavorite: false,
    icon: <DashboardIcon size={32} />,
  },
  {
    title: "Overview",
    path: "/overview",
    isNav: true,
    isFavorite: true,
    icon: <DashboardIcon size={32} />,
  },
  {
    title: "Blocks",
    path: "/blocks",
    isNav: true,
    isFavorite: true,
    icon: <BlockIcon size={32} />,
  },
  {
    title: "BTC To Fiat",
    path: "/btc2fiat",
    isNav: true,
    isFavorite: true,
    icon: <ExchangeIcon size={34} />,
  },
  {
    title: "Premium",
    path: "/premium",
    isNav: true,
    isFavorite: true,
    icon: <PremiumIcon size={30} />,
  },
  {
    title: "Orange Pill",
    path: "/orange-pill",
    isNav: true,
    isFavorite: true,
    icon: <PillIcon size={30} />,
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
