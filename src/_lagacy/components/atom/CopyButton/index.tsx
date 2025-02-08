import { memo, useCallback } from "react";
import IconButton from "@mui/material/IconButton";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { toast } from "react-toastify";
import { clipboardUtil } from "kku-util";
import { btcInfo } from "@/data/btcInfo";

interface ICopy {
  txt: string;
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
    <IconButton onClick={clickCopy} aria-label="copy" sx={{ color: btcInfo.color }}>
      <ContentCopyIcon fontSize="small" />
    </IconButton>
  );
};

export default memo(CopyButton);
