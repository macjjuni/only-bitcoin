import { memo } from "react";
import { NavLink } from "react-router-dom";
import { KIcon } from "kku-ui";
import router from "@/app/router";
import "./BottomNavigation.scss";


const BottomNavigation = () => {

  // region [Hooks]
  // endregion


  return (
    <div className="bottom-navigation">
      <ul className="bottom-navigation__list">
        {router.favoriteNavigationList.map(({ path, icon, style }) => (
          <li key={path} className="bottom-navigation__list__item">
            <NavLink className="bottom-navigation__list__item__link" to={path} style={style || {}}>
              <KIcon icon={icon!.name} color="currentColor" size={icon?.size} />
            </NavLink>
            <span className="bottom-navigation__list__item__focus-bg"/>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default memo(BottomNavigation);

