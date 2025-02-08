import { memo } from "react";
import { FaWonSign } from "react-icons/fa";

const KrwIcon = ({ size }: { size: number }) => {
  return <FaWonSign size={size} color="#828282" />;
};

export default memo(KrwIcon);
