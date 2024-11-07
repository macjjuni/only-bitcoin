import { memo, useCallback } from "react";
import { Box } from "@mui/material";
import { toast } from "react-toastify";
import { clipboardUtil } from "kku-util";

interface ICopy {
  txt: string | number;
}

const CopyButton = ({ txt }: ICopy) => {
  const clickCopy = useCallback(async () => {
    if (!txt) return;
    const target = txt.toString();
    const isDone = await clipboardUtil.copyToClipboard(target);
    if (isDone) {
      toast.success(`"${txt}" 복사 완료!`);
    } else {
      toast.error("복사 실패!");
    }
  }, [txt]);

  return (
    <Box onClick={clickCopy} aria-label="copy">
      {txt}
    </Box>
  );
};

export default memo(CopyButton);
