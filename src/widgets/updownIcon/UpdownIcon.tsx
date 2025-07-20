import { memo } from "react";
import { KIcon } from "kku-ui";
import "./UpdownIcon.scss";

interface UpdownIconTypes { isUp: boolean; size?: number; }


const UpdownIcon = ({ isUp, size = 8 }: UpdownIconTypes) => {

  return (<KIcon className="updown-icon" icon={isUp ? "triangleUp" : "triangleDown"}
                 color={isUp ? '#22d48e' : '#F6465D'} size={size} />);
};

export default memo(UpdownIcon);
