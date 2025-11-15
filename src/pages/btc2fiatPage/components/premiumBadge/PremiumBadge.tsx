import { memo } from "react";
import useStore from "@/shared/stores/store";
import "./Premium-badge.scss";
import { PremiumIcon } from "@/components/icon";

const PremiumBadge = () => {

  const premium = useStore(state => state.premium);

  if (premium === 0) { return null; }

  return (
    <div className="premium__badge">
      <PremiumIcon size={20} />
      +{premium}%
    </div>
  );
};

export default memo(PremiumBadge);