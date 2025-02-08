import { memo, ChangeEvent, useMemo } from "react";
import { Stack, FormControl, InputLabel, OutlinedInput, InputAdornment } from "@mui/material";
import BtcIcon from "@/components/icon/BtcIcon";
import CopyButton from "@/components/atom/CopyButton";

interface IAmountInput {
  readOnly: boolean;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  standard: boolean;
}

// 기본 기준으로 설정되어 있으므로 메모이제이션 처리

const AmountInput = ({ readOnly, value, onChange, standard }: IAmountInput) => {
  const isFocused = useMemo(() => {
    return !standard ? "Mui-focused" : "";
  }, [standard]);

  return (
    <FormControl fullWidth>
      <InputLabel htmlFor="outlined-adornment-amount" className={isFocused}>
        BitCoin
      </InputLabel>
      <OutlinedInput
        label="BitCoin"
        className={`input-center ${isFocused}`}
        readOnly={readOnly}
        value={value}
        type="number"
        slotProps={{ input: { min: 0, step: 0.1, inputMode: "decimal", pattern: "[0-9]+([.,]0|[1-9]+)?" } }}
        onChange={onChange}
        startAdornment={
          <InputAdornment position="start">
            <Stack justifyContent="center" alignItems="center" width="36px">
              <BtcIcon size={32} />
            </Stack>
          </InputAdornment>
        }
        endAdornment={<CopyButton txt={value} />}
      />
    </FormControl>
  );
};

export default memo(AmountInput);
