import { IconButton } from "@mui/material";
import { BiRefresh } from "react-icons/bi";
import { memo } from "react";

interface RefreshButtonProps {
  onClick?: () => void;
}

function NetworkStatusButton(props: RefreshButtonProps) {

  const { onClick } = props;

  return (
    <IconButton className="only-btc__market-price__cost__text--right" color="primary" aria-label="refresh socket"
                size="small" onClick={onClick}>
      <BiRefresh size="24px" />
    </IconButton>
  );
};

export default memo(NetworkStatusButton);