import { memo } from "react";
import { Popover, Typography } from "@mui/material";

interface IPopOver {
  anchorEl: HTMLElement | null;
  open: boolean;
  handlePopoverClose: (e: React.MouseEvent<HTMLElement>) => void;
}

const PopOver = ({ anchorEl, open, handlePopoverClose }: IPopOver) => {
  return (
    <Popover
      id="mouse-over-popover"
      sx={{ pointerEvents: "none" }}
      open={open}
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: "center", horizontal: "left" }}
      transformOrigin={{ vertical: "center", horizontal: "right" }}
      onClose={handlePopoverClose}
      disableRestoreFocus
    >
      <Typography fontSize={14} px="8px" py="4px">
        한국 프리미엄
      </Typography>
    </Popover>
  );
};

export default memo(PopOver);
