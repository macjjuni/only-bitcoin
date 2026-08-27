import Image from "next/image";
import type { ExchangeMeta, WithdrawAsset } from "@/entities/exchange";
import { comma } from "@/shared/utils/string";
import type { WithdrawCell } from "../lib/calculateWithdrawFee";
import { ASSET_THEME } from "../model/exchangeFeeTheme";
import { EXCHANGE_LOGO, resolveLogoClassName } from "../model/exchangeLogo";

interface ExchangeFeeRowProps {
  asset: WithdrawAsset;
  cell?: WithdrawCell;
  exchange: ExchangeMeta;
}

// region [Privates]
const formatQuantityNumber = (quantity: number) =>
  quantity.toLocaleString("en-US", { maximumFractionDigits: 8 });

const AssetQuantity = ({ quantity, asset }: { quantity: number; asset: WithdrawAsset }) => (
  <>
    {formatQuantityNumber(quantity)}{" "}
    <span className="text-[10px] text-muted-foreground -ml-1.5">{asset}</span>
  </>
);

/** 수수료 0은 값이 빠진 것처럼 보이지 않도록 `무료`로 표시한다. */
const formatWithdrawFee = (cell: WithdrawCell, asset: WithdrawAsset) =>
  cell.withdrawFeeInAsset === 0 ? (
    "무료"
  ) : (
    <AssetQuantity quantity={cell.withdrawFeeInAsset} asset={asset} />
  );

const formatMinimumWithdraw = (cell: WithdrawCell, asset: WithdrawAsset) => {
  if (cell.minimumWithdraw === null) {
    return "정보 없음";
  }

  return <AssetQuantity quantity={cell.minimumWithdraw} asset={asset} />;
};

const resolveWithdrawFeeClassName = (cell: WithdrawCell, asset: WithdrawAsset) =>
  cell.withdrawFeeInAsset === 0 ? "text-up" : ASSET_THEME[asset].fee;
// endregion

// region [Templates]
export function ExchangeFeeRow({ asset, cell, exchange }: ExchangeFeeRowProps) {
  const isFallbackValue = exchange.source === "fallback";
  const isWithdrawUnavailable = cell?.isWithdrawAvailable === false;

  const logoSrc = EXCHANGE_LOGO[exchange.id];
  const logoClassName = resolveLogoClassName(exchange.id);

  const exchangeLabel = (
    <div className="flex min-w-0 flex-col items-start gap-0.5">
      <div className="flex items-center gap-1.5">
        <Image src={logoSrc} alt={exchange.name} width={18} height={18} className={logoClassName} />
        <strong className="text-base font-bold">{exchange.name}</strong>
      </div>
      {isFallbackValue && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
          Fallback Data
        </span>
      )}
      {isWithdrawUnavailable && (
        <>
          <span className="rounded-full bg-down/10 px-1.5 py-0.5 text-[10px] font-bold text-down">
            출금 중단
          </span>
          {cell.suspensionMessage && (
            <span
              className="max-w-full truncate text-[10px] text-muted-foreground"
              title={cell.suspensionMessage}
            >
              {cell.suspensionMessage}
            </span>
          )}
        </>
      )}
    </div>
  );

  if (!cell) {
    return (
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 px-3 py-3 border-border">
        {exchangeLabel}
        <span className="col-span-2 text-right text-xs font-medium text-muted-foreground">
          미지원
        </span>
      </div>
    );
  }

  const withdrawFeeLabel = formatWithdrawFee(cell, asset);
  const minimumWithdrawLabel = formatMinimumWithdraw(cell, asset);
  const withdrawFeeClassName = resolveWithdrawFeeClassName(cell, asset);
  const withdrawFeeInKrwLabel =
    cell.withdrawFeeInAsset === 0 || cell.withdrawFeeInKrw === null
      ? null
      : `≈ ${comma(Math.round(cell.withdrawFeeInKrw))}원`;
  const minimumWithdrawInKrwLabel =
    cell.minimumWithdrawInKrw === null
      ? null
      : `≈ ${comma(Math.round(cell.minimumWithdrawInKrw))}원`;

  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 px-3 py-2 border-border">
      {exchangeLabel}

      <div className="min-w-0 text-right">
        <span className={`font-number block truncate text-base font-black ${withdrawFeeClassName}`}>
          {withdrawFeeLabel}
        </span>
        {withdrawFeeInKrwLabel && (
          <span className="font-number block text-[11px] text-muted-foreground">
            {withdrawFeeInKrwLabel}
          </span>
        )}
      </div>

      <div className="min-w-0 text-right">
        <span className="font-number block truncate text-base font-black text-foreground">
          {minimumWithdrawLabel}
        </span>
        {minimumWithdrawInKrwLabel && (
          <span className="font-number block text-[11px] text-muted-foreground">
            {minimumWithdrawInKrwLabel}
          </span>
        )}
      </div>
    </div>
  );
}
// endregion
