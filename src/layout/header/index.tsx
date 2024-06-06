import { useState, useCallback, type KeyboardEvent, type MouseEvent, useEffect } from "react";
import { Stack, AppBar, SwipeableDrawer, List, ListItem, ListItemText, ListItemIcon, ListItemButton } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useBearStore } from "@/store";
import { layout } from "@/styles/style";

import BtcDominance from "@/components/widget/BtcDominance";
import ExRatePrice from "@/components/widget/ExRatePrice";
import RefreshButton from "@/components/atom/RefreshButton";
import FearGreed from "@/components/widget/FearGreed";
import ExRateDialog from "@/components/modal/ExRateDialog";

import { routesWithIcon } from "@/router";
import MenuButton from "@/components/atom/menuButton";

const Header = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const theme = useBearStore((state) => state.theme);
  const [isEx, setEx] = useState(false); // 환율&김프 모달
  const [isOpen, setOpen] = useState(false);

  const toggleDrawer = useCallback(
    (open: boolean) => (event: KeyboardEvent | MouseEvent) => {
      if (event && event.type === "keydown" && ((event as KeyboardEvent).key === "Tab" || (event as KeyboardEvent).key === "Shift")) return;
      setOpen(open);
    },
    []
  );

  const showDialog = useCallback(() => {
    setEx(true);
  }, [isEx]);

  const onToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, [isOpen]);

  const onRoute = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
  }, []);

  const getActiveColor = useCallback(() => {
    if (theme === "light") return "#e0e0e0";
    return "#616161";
  }, [theme]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <AppBar position="static" sx={{ boxShadow: "none", background: "inherit" }}>
        <Stack height={layout.header} flexDirection="row" alignItems="center" justifyContent="space-between">
          <Stack flexDirection="row" gap="8px" alignItems="center">
            <MenuButton onToggle={onToggle} />
            <BtcDominance />
            <ExRatePrice onClick={showDialog} />
            <FearGreed />
          </Stack>
          <RefreshButton />
        </Stack>

        {/* 사이드 메뉴바 */}
        <SwipeableDrawer anchor="left" open={isOpen} onClose={toggleDrawer(false)} onOpen={toggleDrawer(true)}>
          <List sx={{ width: "240px" }}>
            {routesWithIcon.map((route) => (
              <ListItem
                key={route.id}
                disablePadding
                sx={{ bgcolor: pathname === route.path ? getActiveColor() : "none" }}
                onClick={() => {
                  onRoute(route.path);
                }}
              >
                <ListItemButton>
                  <ListItemIcon sx={{ minWidth: "40px" }}>{route.icon}</ListItemIcon>
                  <ListItemText primary={route.title} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </SwipeableDrawer>
      </AppBar>
      {/* 한국 프리미엄 및 환율 정보 */}
      <ExRateDialog open={isEx} setOpen={setEx} />
    </>
  );
};

export default Header;
