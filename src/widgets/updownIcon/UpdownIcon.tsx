import { memo } from "react";
import { KIcon } from "kku-ui";
import "./UpdownIcon.scss";

interface UpdownIconTypes { isUp: boolean; size?: number; }


const UpdownIcon = ({ isUp, size = 8 }: UpdownIconTypes) => {

  return (<KIcon className={`updown-icon ${isUp ? "updown-icon--up" : "updown-icon--down"}`}
                 icon={isUp ? "triangleUp" : "triangleDown"} color="currentColor" size={size} />);
};

export default memo(UpdownIcon);
