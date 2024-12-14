import { type Dispatch, memo, type MouseEvent, type SetStateAction, useCallback, useState } from "react";
import { RiCloseCircleLine } from "react-icons/ri";
import { Container, Dialog, DialogTitle, IconButton, Stack, Switch, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { bearStore } from "@/store/store";
import { type MarketType } from "@/store/store.interface";
import { useBearStore } from "@/store";

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
  const isCountAnime = useBearStore((state) => state.isCountAnime);
  const setCountAnime = useBearStore((state) => state.setCountAnime);
  const isUsdtEnabled = useBearStore(state => state.isUsdtRateEnabled);
  const setUsdtRateEnabled = useBearStore(state => state.setUsdtRateEnabled);

  const closeDialog = useCallback(() => {
    setOpen(false);
  }, []);

  const marketChange = useCallback(
    (_: MouseEvent<HTMLElement>, selectMarket: MarketType) => {
      if (selectMarket === null) return;
      const getMarket = bearStore.setMarket(selectMarket);
      setMarket(getMarket);
    },
    [market]
  );

  const onToggleAnime = useCallback(() => {
    setCountAnime(!isCountAnime);
  }, [isCountAnime]);

  const onToggleUsdtEnabled = useCallback(()=> {
    setUsdtRateEnabled(!isUsdtEnabled);
  }, [isUsdtEnabled])

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
                💰 USDT 기준 환율 적용
              </Typography>
              <Switch checked={isUsdtEnabled} onChange={onToggleUsdtEnabled} />
            </Stack>

            <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
              <Typography fontSize={16} fontWeight="bold">
                🕺🏻 카운트 애니메이션
              </Typography>
              <Switch checked={isCountAnime} onChange={onToggleAnime} />
            </Stack>
          </Stack>
        </Container>
      </Dialog>
    </>
  );
};

export default memo(SettingDialog);
