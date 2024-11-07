import { memo, useState, useEffect } from "react";
import { Popover, Stack, Typography, useMediaQuery } from "@mui/material";
import { responsive } from "@/styles/style";
import Progress from "@/components/molecule/Progress";
import { useBearStore } from "@/store";
import { formatDate, calcCurrentDateDifference } from "@/utils/date";

interface PopOverProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  handlePopoverClose: (e: React.MouseEvent<HTMLElement>) => void;
}

const PopOver = ({ anchorEl, open, handlePopoverClose }: PopOverProps) => {
  const matches = useMediaQuery(`(min-width: ${responsive.mobile}px)`);
  const blockData = useBearStore((state) => state.blockData);
  const [diff, setDiff] = useState(calcCurrentDateDifference(blockData.timeStamp, "minute"));

  useEffect(() => {
    setDiff(calcCurrentDateDifference(blockData.timeStamp, "minute"));
  }, [blockData]);

  return (
    <Popover
      sx={{ pointerEvents: "none" }}
      open={open}
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      transformOrigin={{ vertical: "top", horizontal: "center" }}
      onClose={handlePopoverClose}
      disableRestoreFocus
    >
      <Stack px="8px" pt="4px" pb="8px" gap="6px">
        <Typography fontSize={matches ? 16 : 14}>
          블록 생성 시간: {formatDate(blockData.timeStamp).replace(/-/g, ".")}({diff}분 전)
        </Typography>
        <Progress isMaxNum />
      </Stack>
    </Popover>
  );
};

export default memo(PopOver);
