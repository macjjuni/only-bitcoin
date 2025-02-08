import { memo, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { routesWithIcon } from "@/router/routes";
import "./drawer.scss";

interface DrawerProps {
  isOpen: boolean;
  onRoute: (url: string) => void;
  closeDrawer: () => void;
}

function Drawer({ isOpen, onRoute, closeDrawer }: DrawerProps) {
  // region [Hooks]
  const { pathname } = useLocation();
  // endregion

  // region [Styles]

  const rootClass = useMemo(() => {
    if (isOpen) {
      return "only-btc__drawer--open";
    }
    return "";
  }, [isOpen]);

  const classListButton = useCallback(
    (path: string) => {
      if (path === "/" && pathname === "/") {
        return "only-btc__drawer__list--active";
      }
      if (path !== "/" && pathname.includes(path)) {
        return "only-btc__drawer__list--active";
      }
      return "";
    },
    [pathname]
  );

  // endregion

  return (
    <div className={`only-btc__drawer ${rootClass}`}>
      <ul className="only-btc__drawer__wrapper">
        {routesWithIcon.map((route) => (
          <li key={route.id} className={`only-btc__drawer__list ${classListButton(route.path)}`}>
            <button type="button" className="only-btc__drawer__list-button" onClick={() => onRoute(route.path)}>
              <span className="only-btc__drawer__list-button-icon">{route.icon}</span>
              <span className="only-btc__drawer__list-button-text">{route.title}</span>
            </button>
          </li>
        ))}
      </ul>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions,jsx-a11y/click-events-have-key-events */}
      <div className="only-btc__drawer__overlay" onClick={closeDrawer} />
    </div>
  );
}

export default memo(Drawer);
