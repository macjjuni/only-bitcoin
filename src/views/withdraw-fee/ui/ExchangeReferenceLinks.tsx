import { ExternalLink } from "lucide-react";
import Image from "next/image";
import type { ExchangeMeta } from "@/entities/exchange";
import { EXCHANGE_LOGO, resolveLogoClassName } from "../model/exchangeLogo";

interface ExchangeReferenceLinksProps {
  exchanges: ExchangeMeta[];
}

// region [Templates]
/**
 * 거래소 공식 수수료 안내 페이지로 나가는 링크 줄.
 *
 * 표의 값은 12시간마다 갱신되는 스냅샷이라 언제든 실제와 어긋날 수 있음.
 * 그래서 "직접 확인하세요" 문구 바로 밑에 원문으로 가는 길을 같이 둠.
 */
export function ExchangeReferenceLinks({ exchanges }: ExchangeReferenceLinksProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/15 px-3 py-2.5">
      <strong className="text-[11px] font-bold text-muted-foreground">공식 수수료 안내</strong>
      <div className="flex flex-wrap gap-1.5">
        {exchanges.map((exchange) => (
          <a
            key={exchange.id}
            href={exchange.referenceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground transition-colors hover:border-bitcoin hover:text-bitcoin"
          >
            <Image
              src={EXCHANGE_LOGO[exchange.id]}
              alt=""
              width={14}
              height={14}
              className={resolveLogoClassName(exchange.id)}
            />
            {exchange.name}
            <ExternalLink size={11} className="text-muted-foreground" aria-hidden />
          </a>
        ))}
      </div>
    </div>
  );
}
// endregion
