import { useCallback, useEffect, useState } from "react";
import { Stack } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { IoMdRefresh } from "react-icons/io";
import { CgMenuGridR } from "react-icons/cg";
import BtcDominance from "@/layout/header/components/BtcDominance";
import ExRatePrice from "@/layout/header/components/ExRatePrice";
import FearGreed from "@/layout/header/components/FearGreed";
import ExRateDialog from "@/components/modal/ExRateDialog";
import { btcInfo } from "@/data/btcInfo";
import Drawer from "@/layout/header/components/drawer/drawer";
import "./header.scss";

const Header = () => {
  // region [Hooks]
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isEx, setEx] = useState(false); // 환율&김프 모달
  const [isOpen, setOpen] = useState(false);
  // endregion

  // region [Events]

  const onClickRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  // endregion

  // region [Privates]

  const openDrawer = useCallback(() => {
    setOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setOpen(false);
  }, []);

  const showDialog = useCallback(() => {
    setEx(true);
  }, [isEx]);

  const onRoute = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
  }, []);

  // endregion

  // region [Effects]

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // endregion

  return (
    <>
      <header className="only-btc__header">
        <div className="only-btc__header__container">
          <Stack flexDirection="row" gap="8px" alignItems="center">
            <button type="button" className="only-btc__header__hamburger-button" onClick={openDrawer}>
              <CgMenuGridR size={32} />
            </button>

            <BtcDominance />
            <ExRatePrice onClick={showDialog} />
            <FearGreed />
          </Stack>
          <button type="button" className="only-btc__header__refresh-button" onClick={onClickRefresh}>
            <IoMdRefresh fontSize={28} color={btcInfo.color} />
          </button>
        </div>

        <Drawer isOpen={isOpen} onRoute={onRoute} closeDrawer={closeDrawer} />
      </header>
      {/* 한국 프리미엄 및 환율 정보 */}
      <ExRateDialog open={isEx} setOpen={setEx} />
    </>
  );
};

export default Header;
