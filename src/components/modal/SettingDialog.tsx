import { memo, type Dispatch, type SetStateAction, type MouseEvent, useCallback, useState } from "react";
import { RiCloseCircleLine } from "react-icons/ri";
import { DialogTitle, Dialog, Container, Typography, ToggleButtonGroup, ToggleButton, IconButton, Stack, Switch } from "@mui/material";
import { bearStore } from "@/store";
import { type MarketType } from "@/store/type";

type DialogType = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

const threeButtons = [
  { value: "KRW", width: "36px" },
  { value: "USD", width: "36px" },
  { value: "KRW/USD", width: "65px" },
];

const SettingDialog = ({ open, setOpen }: DialogType) => {
  const [market, setMarket] = useState(bearStore.market);
  const [theme, setTheme] = useState(bearStore.theme);
  const [isKimchi, setKimchi] = useState(bearStore.isKimchi);
  const [isEcoSystem, setEco] = useState(bearStore.isEcoSystem);
  const [isCountAnime, setCountAnime] = useState(bearStore.isCountAnime);
  const [isCountColor, setCountColor] = useState(bearStore.isCountAnime);

  const closeDialog = useCallback(() => {
    setOpen(false);
  }, []);

  const marketChange = useCallback(
    (e: MouseEvent<HTMLElement>, selectMarket: MarketType) => {
      if (selectMarket === null) return;
      const getMarket = bearStore.setMarket(selectMarket);
      setMarket(getMarket);
    },
    [market]
  );

  const onToggleTheme = useCallback(() => {
    const getTheme = bearStore.setTheme(theme === "dark" ? "light" : "dark");
    setTheme(getTheme);
  }, [theme]);

  const onToggleKimchi = useCallback(() => {
    const getIsKimchi = bearStore.setKimchi(!isKimchi);
    setKimchi(getIsKimchi);
  }, [isKimchi]);

  const onToggleEco = useCallback(() => {
    const getIsEco = bearStore.setEco(!isEcoSystem);
    setEco(getIsEco);
  }, [isEcoSystem]);

  const onToggleAnime = useCallback(() => {
    const getIsCountAnime = bearStore.setCountAnime(!isCountAnime);
    setCountAnime(getIsCountAnime);
  }, [isCountAnime]);

  const onToggleCountColor = useCallback(() => {
    const getIsCountColor = bearStore.setCountColor(!isCountColor);
    setCountColor(getIsCountColor);
  }, [isCountColor]);

  return (
    <>
      <Dialog onClose={closeDialog} open={open} className="mui-dialog">
        <DialogTitle width="100%" minWidth={340} borderBottom="1px solid #a5a5a5" sx={{ padding: "12px 16px" }}>
          <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
            <Typography component="p" fontSize={16} fontWeight="bold">
              설정
            </Typography>
            <IconButton onClick={closeDialog} sx={{ padding: "0" }}>
              <RiCloseCircleLine fontSize={24} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Container sx={{ padding: "16px" }}>
          <Stack flexDirection="column" justifyContent="flex-start" gap="8px">
            <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
              <Typography fontSize={16} fontWeight="bold">
                💵 단위
              </Typography>
              <ToggleButtonGroup color="primary" value={market} exclusive onChange={marketChange} aria-label="Platform">
                {threeButtons.map((unit) => (
                  <ToggleButton key={unit.value} value={unit.value} size="small">
                    <Typography fontSize={14} fontWeight="bold" width={unit.width}>
                      {unit.value}
                    </Typography>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
            <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
              <Typography fontSize={16} fontWeight="bold">
                🎨 다크모드
              </Typography>
              <Switch checked={theme === "dark"} onChange={onToggleTheme} />
            </Stack>
            <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
              <Typography fontSize={16} fontWeight="bold">
                🇰🇷 프리미엄 정보
              </Typography>
              <Switch checked={isKimchi} onChange={onToggleKimchi} />
            </Stack>
            <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
              <Typography fontSize={16} fontWeight="bold">
                🦐 생태계 표시
              </Typography>
              <Switch checked={isEcoSystem} onChange={onToggleEco} />
            </Stack>
            <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
              <Typography fontSize={16} fontWeight="bold">
                🕺🏻 카운트 애니메이션
              </Typography>
              <Switch checked={isCountAnime} onChange={onToggleAnime} />
            </Stack>
            <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
              <Typography fontSize={16} fontWeight="bold">
                🌈 가격 변동 색상
              </Typography>
              <Switch checked={isCountColor} onChange={onToggleCountColor} />
            </Stack>
          </Stack>
        </Container>
      </Dialog>
    </>
  );
};

export default memo(SettingDialog);
