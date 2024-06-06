import { memo, useMemo } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { btcColor } from "@/data/btcInfo";
import { useBearStore } from "@/store";
import { comma } from "@/utils/common";

const Progress = ({ isMaxNum }: { isMaxNum?: boolean }) => {
  const blockData = useBearStore((state) => state.blockData);

  const LinearProgressWithLabel = useMemo(() => {
    return (
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box sx={{ width: "100%", mr: 1, color: btcColor }}>
          <LinearProgress sx={{ height: "24px" }} variant="determinate" value={blockData.halvingPercent} />
        </Box>
        {isMaxNum && (
          <Box sx={{ minWidth: 40 }}>
            <Typography fontSize={12} pr={1} variant="body2">{`${comma(blockData.nextHalving.nextHalvingHeight?.toString())}`}</Typography>
          </Box>
        )}
      </Box>
    );
  }, [blockData.halvingPercent, blockData.nextHalving.nextHalvingHeight, isMaxNum]);

  return (
    <Box sx={{ width: "100%" }} position="relative">
      <Box position="absolute" top="50%" left="0" fontSize={14} textAlign="right" pr={1.5} sx={{ width: `calc(${blockData.halvingPercent}% - 40px)`, translate: "0 -50%", zIndex: 1 }}>
        {blockData.halvingPercent}%
      </Box>
      {LinearProgressWithLabel}
    </Box>
  );
};

export default memo(Progress);
