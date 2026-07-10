"use client";

import { memo, useMemo } from "react";
import useBtc2FiatStore from "../model/btc2FiatStore";

const PremiumBadge = () => {
  const premium = useBtc2FiatStore((state) => state.premium);
  const numberSign = useMemo(() => (premium > 0 ? "+" : ""), [premium]);

  if (premium === 0) {
    return null;
  }

  return (
    <div className="absolute top-2.5 left-4 layout-max:left-6 flex items-center justify-start gap-1 text-md font-bold text-bitcoin">
      Premium: {numberSign}
      {premium}%
    </div>
  );
};

const MemoizedPremiumBadge = memo(PremiumBadge);
MemoizedPremiumBadge.displayName = "PremiumBadge";

export default MemoizedPremiumBadge;
