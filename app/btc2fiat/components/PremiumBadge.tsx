'use client';

import { memo, useMemo } from "react";
import useStore from "@/shared/stores/store";

const PremiumBadge = () => {

  const premium = useStore(state => state.premium);
  const numberSign = useMemo(() => (premium > 0 ? "+" : ""), [premium]);

  if (premium === 0) {
    return null;
  }

  return (
    <div className="absolute top-0 left-6 flex items-center justify-start gap-1 text-md font-bold text-bitcoin">
      Premium: {numberSign}{premium}%
    </div>
  );
};

const MemoizedPremiumBadge= memo(PremiumBadge);
MemoizedPremiumBadge.displayName = "PremiumBadge";

export default MemoizedPremiumBadge;