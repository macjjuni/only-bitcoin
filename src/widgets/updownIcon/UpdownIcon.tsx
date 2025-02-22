import { memo, useMemo } from "react";
import { KIcon } from "kku-ui";
import "./UpdownIcon.scss";

interface UpdownIconTypes { isUp: boolean; size?: number; }


const UpdownIcon = ({ isUp, size = 8 }: UpdownIconTypes) => {


  // region [Styles]

  const rootClass = useMemo(() => (
    isUp ? "updown-icon--up" : "updown-icon--down"), [isUp]);

  // endregion


  return (<KIcon className={`updown-icon ${rootClass}`} icon={isUp ? "triangleUp" : "triangleDown"}
                 color="currentColor" size={size} />);
};

export default memo(UpdownIcon);