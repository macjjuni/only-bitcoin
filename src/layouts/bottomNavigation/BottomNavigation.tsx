import { memo } from "react";
import { NavLink } from "react-router-dom";
import router from "@/app/router";

const BottomNavigation = () => {
  return (
    <nav
      className={[
        "fixed bottom-0 left-0 w-full h-bottom-nav z-[1] overflow-hidden bg-transparent backdrop-blur-[8px] pb-2",
        "border-t border-border layout-max:left-1/2 layout-max:-translate-x-1/2",
        "w-full layout-max:max-w-[calc(theme(maxWidth.layout)_-_2px)]"
      ].join(" ")}
    >
      <ul className="flex justify-around items-center w-full h-full">
        {router.navigationRouteList.map(({ path, icon }) => (
          <li key={path} className="relative z-0">
            <NavLink
              to={path}
              className={({ isActive }) => [
                "flex justify-center items-center p-3 rounded-lg z-10 tap-highlight-transparent transition-colors",
                isActive
                  ? "text-[#F7931A] dark:text-[#F7931A]" // Bitcoin Color (Active)
                  : "text-black dark:text-white" // Default (Inactive)
              ].join(" ")}
            >
              {/* icon 컴포넌트 내부에서 currentColor를 쓰도록 유도하거나 스타일 강제 */}
              <span className="inline-block text-[0px]">
                {icon}
              </span>
            </NavLink>
            {/* 필요하다면 여기에 포커스 배경 등 추가 */}
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default memo(BottomNavigation);