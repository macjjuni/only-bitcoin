import { useMemo, memo, ReactNode } from "react";
import { Stack, Chip, useMediaQuery } from "@mui/material";
import { responsive } from "@/styles/style";

interface IChip {
  label: string | ReactNode;
  value: string;
  onClick?: () => void;
}

const ChipItem = ({ label, value, onClick }: IChip) => {
  const matches = useMediaQuery(`(min-width: ${responsive.mobile}px)`);

  const generateLabel = useMemo(() => {
    return (
      <Stack flexDirection="row" gap="4px" alignContent="center" alignItems="center" onClick={onClick} sx={{ cursor: "pointer" }}>
        <span className="fcc">{label}</span>
        <span style={{ textShadow: "1px 1px 1px #d0d0d0" }}>{value}</span>
      </Stack>
    );
  }, [value]);

  return <Chip className="chip-txt" label={generateLabel} variant="outlined" size={matches ? "medium" : "small"} sx={{ borderRadius: 0, fontSize: matches ? "18px" : "13px" }} />;
};

export default memo(ChipItem);
