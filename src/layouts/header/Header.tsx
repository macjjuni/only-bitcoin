import { memo } from "react";
import { Link } from "react-router";
import { KIcon } from "kku-ui";
import { ConnectionDot } from "@/components";
import SettingButton from "@/layouts/header/components/settingButton/SettingButton";
import useStore from "@/shared/stores/store";


const Header = () => {

  const initialPath = useStore(state => state.setting.initialPath);

  return (
    <header
      className={[
        "fixed top-0 left-0 layout-max:left-1/2 layout-max:-translate-x-1/2 bg-background",
        "flex justify-between items-center gap-1 w-full layout-max:max-w-[calc(theme(maxWidth.layout)_-_2px)] h-header p-2",
        "z-[1] select-none tap-highlight-transparent",
        // 하단 그라데이션
        "after:content-[''] after:fixed after:top-header after:left-0 after:w-full after:h-4",
        "after:bg-gradient-to-b after:from-background after:to-transparent",
        "dark:after:from-background dark:after:to-transparent"
      ].filter(Boolean).join(" ")}
    >
      <h2 className="font-bold tracking-[-1px] text-current">
        <Link to={initialPath} className="flex justify-start items-center gap-2 text-current dark:text-current !no-underline
              text-3xl font-bold">
          <KIcon icon="bitcoin" size={36} />
          ₿itcoin
        </Link>
      </h2>

      <div className="flex justify-center items-center gap-2">
        <ConnectionDot />
        <SettingButton />
      </div>
    </header>
  );
};


const MemoizedHeader = memo(Header);
MemoizedHeader.displayName = "Header";
Header.displayName = "Header";

export default MemoizedHeader;
