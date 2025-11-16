import { memo, useMemo } from "react";
import useStore from "@/shared/stores/store";
import { PremiumIcon } from "@/components/icon";
import "./Premium-badge.scss";

const PremiumBadge = () => {

  const premium = useStore(state => state.premium);
  const numberSign = useMemo(() => (premium > 0 ? '+' : ''), [premium])

  if (premium === 0) { return null; }

  return (
    <div className="premium__badge">
      <PremiumIcon size={20} />
      {numberSign}{premium}%
    </div>
  );
};

export default memo(PremiumBadge);