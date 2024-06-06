import { memo, useState, useCallback } from "react";
import { Stack, Typography } from "@mui/material";
import CubeLottie from "./components/CubeLottie";
import PopOver from "./components/PopOver";
import { BlockProps } from "@/store/type";
import CountText from "@/components/atom/CountText";

const BlockView = ({ blockData }: { blockData: BlockProps }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const handlePopoverOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handlePopoverClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  return (
    <Stack mb="-60px" display="flex" flexDirection="row" justifyContent="flex-end" alignItems="center" maxWidth="400px" width="100%">
      <Stack
        position="relative"
        height="48px"
        display="flex"
        flexDirection="row"
        justifyContent="flex-end"
        alignItems="center"
        gap="8px"
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
      >
        <CubeLottie />
        <Typography fontSize={20} fontWeight="bold" letterSpacing="0.64px" mr="8px">
          <CountText text={blockData.height} duration={0.3} isAnime />
        </Typography>
      </Stack>
      <PopOver anchorEl={anchorEl} open={Boolean(anchorEl)} handlePopoverClose={handlePopoverClose} />
    </Stack>
  );
};

export default memo(BlockView);
