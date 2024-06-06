import { memo, useState } from "react";
import { Stack, IconButton } from "@mui/material";
import { IoIosInformationCircleOutline } from "react-icons/io";
import { FcSettings } from "react-icons/fc";
import CopyDialog from "@/components/modal/CopyDialog";
import SettingDialog from "@/components/modal/SettingDialog";
import "./footer.scss";

const Footer = () => {
  const [isCopy, setCopy] = useState(false);
  const [isSetting, setSetting] = useState(false);

  const onCopy = () => {
    setCopy(true);
  };
  const onSet = () => {
    setSetting(true);
  };

  return (
    <>
      <footer className="only-btc__footer">
        <div className="only-btc__footer__container">
          <IconButton size="small" title="설정" onClick={onSet} sx={{ padding: 0 }}>
            <FcSettings fontSize={28} />
          </IconButton>
          <Stack component="div" flexDirection="row" alignItems="center" gap="4px">
            <IconButton size="small" title="정보" sx={{ padding: 0 }} onClick={onCopy}>
              <IoIosInformationCircleOutline fontSize={28} />
            </IconButton>
          </Stack>
        </div>
      </footer>
      <CopyDialog open={isCopy} setOpen={setCopy} />
      <SettingDialog open={isSetting} setOpen={setSetting} />
    </>
  );
};

export default memo(Footer);
