import { memo } from "react";
import { type LottieProps } from "react-lottie-player";
import { Box } from "@mui/material";
import LottieItem from "@/components/atom/LottieItem";

const defaultOption: LottieProps = { loop: true, play: true };
const lottieOption = { ...defaultOption, style: { width: "72px", height: "72px" } };
const blockLottiePath = "/lotties/block.json";

const CubeLottie = () => {
  return (
    <Box sx={{ position: "relative", width: "40px", height: "40px", overflow: "hidden" }}>
      <Box sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
        <LottieItem play option={lottieOption} path={blockLottiePath} speed={1} />
      </Box>
    </Box>
  );
};

export default memo(CubeLottie);
