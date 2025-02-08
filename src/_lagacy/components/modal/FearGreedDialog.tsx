import { useState, useRef, useCallback, useEffect, memo, type Dispatch, type SetStateAction } from "react";
import { RiCloseCircleLine } from "react-icons/ri";
import { DialogTitle, Dialog, Container, Typography, IconButton, Stack, Skeleton, useMediaQuery } from "@mui/material";
import { responsive } from "@/styles/style";

const ExRateDialog = ({ open, setOpen }: { open: boolean; setOpen: Dispatch<SetStateAction<boolean>> }) => {
  const matches = useMediaQuery(`(min-width: ${responsive.mobile}px)`);
  const [load, setLoad] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const closeDialog = useCallback(() => {
    setOpen(false);
  }, []);

  const onLoad = useCallback(() => {
    setLoad(true);
    imgRef.current?.classList.add("loaded");
  }, []);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setLoad(false);
      }, 100);
    }
  }, [open]);

  return (
    <Dialog onClose={closeDialog} open={open} className="mui-dialog">
      <DialogTitle minWidth={340} borderBottom="1px solid #a5a5a5" sx={{ padding: "12px 16px" }}>
        <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
          <Typography component="p" fontSize={16} fontWeight="bold">
            공포 & 탐욕 지수
          </Typography>
          <IconButton onClick={closeDialog} sx={{ padding: "0" }}>
            <RiCloseCircleLine fontSize={24} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <Container sx={{ padding: "16px", maxHeight: "534px", overflow: "hidden" }}>
        {!load && <Skeleton variant="rectangular" width={matches ? 550 : "100%"} height="100%" sx={{ bgcolor: "gray.800", aspectRatio: "9 / 8.07" }} />}
        <img
          ref={imgRef}
          onLoad={onLoad}
          className={`fear-greed-img ${load && "loaded"}`}
          src={`https://alternative.me/crypto/fear-and-greed-index.png?${new Date().getTime()}`}
          width="550"
          height="495"
          alt="crypto fear greed index chart"
        />
      </Container>
    </Dialog>
  );
};

export default memo(ExRateDialog);
