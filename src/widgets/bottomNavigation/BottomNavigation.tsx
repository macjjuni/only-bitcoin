import { memo } from "react";
import { NavLink } from "react-router-dom";
import router from "@/app/router";
import "./BottomNavigation.scss";


const BottomNavigation = () => {

  // region [Hooks]
  // endregion


  return (
    <div className="bottom-navigation">
      <ul className="bottom-navigation__list">
        {router.navigationItems.map(({ path, icon, style }) => (
          <li key={path} className="bottom-navigation__list__item">
            <NavLink className="bottom-navigation__list__item__link" to={path} style={style || {}}>
              {icon}
            </NavLink>
            <span className="bottom-navigation__list__item__focus-bg"/>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default memo(BottomNavigation);
