import { Dispatch, memo, SetStateAction } from "react";
import { Container, Dialog, DialogTitle, IconButton, Link, Stack, Typography } from "@mui/material";
import { RiCloseCircleLine } from "react-icons/ri";
import { SiNaver } from "react-icons/si";

const title = import.meta.env.VITE_TITLE || "Info";
const btcDiplomaUrl = "https://t.co/lS2dUOKcK0";
const btcStoreMapUrl = "https://naver.me/GPXCmWjV";
const binanceUrl = "https://binance-docs.github.io/apidocs/spot/en/#introduction";
const upbitUrl = "https://docs.upbit.com/docs/upbit-quotation-websocket";
const coinGeckoUrl = "https://www.coingecko.com/ko";
const feedbackUrl = import.meta.env.VITE_FEEDBACK_URL || "https://twitter.com/kkusaeng";
const gitUrl = import.meta.env.VITE_GIT_URL || "https://github.com/macjjuni/only-bitcoin";

const CopyDialog = ({ open, setOpen }: { open: boolean; setOpen: Dispatch<SetStateAction<boolean>> }) => {
  const closeDialog = () => {
    setOpen(false);
  };

  return (
    <>
      <Dialog onClose={closeDialog} open={open} className="mui-dialog">
        <DialogTitle minWidth={340} borderBottom="1px solid #a5a5a5" sx={{ padding: "12px 16px" }}>
          <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
            <Typography component="p" fontSize={16} fontWeight="bold">
              {title}
            </Typography>
            <IconButton onClick={closeDialog} sx={{ padding: "0" }}>
              <RiCloseCircleLine fontSize={24} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Container sx={{ padding: "16px" }}>
          <Stack component="h2" justifyContent="flex-start" flexDirection="row" alignItems="center" fontWeight="bold" gap="8px" m="0" py="6px">
            <Typography component="p" fontSize={18} fontWeight="bold">
              비트코인 디플로마 [
              <Link href={btcDiplomaUrl} target="_blank" title="비트코인 디플로마 한글 번역본 by ATOMIC BITCOIN">
                💾 다운로드
              </Link>
              ]
            </Typography>
          </Stack>

          <Stack component="h2" justifyContent="flex-start" flexDirection="row" alignItems="center" fontWeight="bold" gap="8px" m="0" py="6px" mb={2}>
            <Typography component="p" fontSize={18} fontWeight="bold">
              비트코인 결제매장 [
              <Link href={btcStoreMapUrl} target="_blank" title="비트코인 결제매장(네이버지도)">
                <SiNaver color="#2DB400" fill="#2DB400" fontSize={14} /> 네이버 지도
              </Link>
              ]
            </Typography>
          </Stack>

          <Typography component="p" fontSize={14}>
            시세 정보:{" "}
            <Link href={upbitUrl} target="_blank" title="Upbit API Docs">
              Upbit
            </Link>{" "}
            /{" "}
            <Link href={binanceUrl} target="_blank" title="Binance API Docs">
              Binance
            </Link>
            /{" "}
            <Link href={coinGeckoUrl} target="_blank" title="Binance API Docs">
              CoinGecko
            </Link>
          </Typography>
          <Typography component="p" fontSize={14}>
            피드백:{" "}
            <Link href={feedbackUrl || "/"} target="_blank" title="Twitter url">
              Twitter
            </Link>
          </Typography>
          <Typography component="p" fontSize={14}>
            깃허브:{" "}
            <Link title="GitHub Repository" href={gitUrl} target="_blank">
              Only-Bitcoin
            </Link>
          </Typography>
        </Container>
      </Dialog>
    </>
  );
};

export default memo(CopyDialog);
