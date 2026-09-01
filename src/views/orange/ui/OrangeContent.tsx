"use client";

import { KIcon } from "kku-ui";
import { HandCoins, TableProperties } from "lucide-react";
import type { ReactNode } from "react";
import {
  BanknoteIcon,
  BuildingIcon,
  CalendarIcon,
  DiscordIcon,
  EagleIcon,
  HalfCircleIcon,
  IncidentIcon,
  MinerIcon,
  NaverIcon,
  PageIcon,
  PageTitle,
  ShootingStarIcon,
  TransitionLink,
  TreasuryIcon,
} from "@/shared/ui";

// region [Types]
interface OrangeLink {
  title: string;
  icon: ReactNode;
  href: string;
}

interface ExternalLinkSectionData {
  headingID: string;
  title: string;
  links: OrangeLink[];
}
// endregion

// region [Constants]
const ICON_CLASS = "text-orange-500 dark:text-orange-400";

const UTILITY_LINKS: OrangeLink[] = [
  {
    title: "M2·비트코인",
    icon: <BanknoteIcon size={28} className={ICON_CLASS} />,
    href: "/m2btc",
  },
  {
    title: "현물 ETF 현황",
    icon: <EagleIcon size={28} className={ICON_CLASS} />,
    href: "/etf",
  },
  {
    title: "트레저리",
    icon: <TreasuryIcon size={28} className={ICON_CLASS} />,
    href: "/treasury",
  },
  {
    title: "월별 등락률",
    icon: <CalendarIcon size={26} className={ICON_CLASS} />,
    href: "/cagr",
  },
  {
    title: "밈 저장소",
    icon: <ShootingStarIcon size={30} className={ICON_CLASS} />,
    href: "/meme",
  },
  {
    title: "아파트 몇 BTC?",
    icon: <BuildingIcon size={28} className={ICON_CLASS} />,
    href: "/btc2apartment",
  },
  {
    title: "거래소 사고 연표",
    icon: <IncidentIcon size={30} className={ICON_CLASS} />,
    href: "/incidents",
  },
  {
    title: "출금 수수료",
    icon: (
      <HandCoins
        size={28}
        strokeWidth={1.8}
        className="[&_circle]:stroke-orange-500 dark:[&_circle]:stroke-orange-400"
      />
    ),
    href: "/withdraw-fee",
  },
  {
    title: "반감기 카운트",
    icon: <HalfCircleIcon size={24} />,
    href: "/blocks/countdown",
  },
  {
    title: "DCA 계산기",
    icon: <MinerIcon size={32} />,
    href: "/dca",
  },
  {
    title: "BIP39",
    icon: <TableProperties size={26} strokeWidth={1.8} />,
    href: "/bip39",
  },
];

const EXTERNAL_LINK_SECTIONS: ExternalLinkSectionData[] = [
  {
    headingID: "academy-heading",
    title: "아카데미",
    links: [
      {
        title: "ATOMIC⚡️₿ITCOIN",
        icon: <KIcon icon="notion" size={22} />,
        href: "http://atomicbtc.kr",
      },
      {
        title: "화폐와 정부 & 비트코인",
        icon: <PageIcon size={22} />,
        href: "https://finished-snake-h7zp8jm.gamma.site",
      },
    ],
  },
  {
    headingID: "community-heading",
    title: "비트코인 커뮤니티",
    links: [
      {
        title: "CITADEL",
        icon: <DiscordIcon size={22} />,
        href: "https://discord.gg/citadel21",
      },
      {
        title: "지분전쟁: 시타델",
        icon: <NaverIcon size={22} />,
        href: "https://cafe.naver.com/btcforever",
      },
    ],
  },
];
// endregion

function ExternalLinkSection({ headingID, title, links }: ExternalLinkSectionData): ReactNode {
  return (
    <section aria-labelledby={headingID} className="mt-6">
      <h2
        id={headingID}
        className="mb-2 px-5 font-pretendard text-sm font-semibold text-muted-foreground"
      >
        {title}
      </h2>

      <div className="grid grid-cols-[2fr_3fr] gap-2">
        {links.map((link) => (
          <a
            key={link.title}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-transform duration-200 active:scale-95"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-300/50 dark:bg-neutral-800">
              {link.icon}
            </span>
            <span className="select-none font-pretendard text-xs font-semibold leading-tight tracking-normal break-keep text-foreground">
              {link.title}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

const OrangeContent = () => {
  return (
    <>
      <section aria-label="서비스">
        <PageTitle
          label="Orange"
          title="오렌지 서비스"
          description="비트코인을 더 깊게 파고들 수 있도록 재밌는 서비스들을 모아봤습니다."
        />

        <div className="grid grid-cols-4 overflow-hidden rounded-2xl">
          {UTILITY_LINKS.map((link) => (
            <TransitionLink
              key={link.title}
              href={link.href}
              className="flex min-h-20 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2.5 text-center transition-transform duration-200 active:scale-95"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-orange-500/10 dark:bg-orange-400/15">
                {link.icon}
              </span>
              <span className="flex min-h-8 items-center justify-center px-1 text-xs font-semibold leading-snug tracking-tighter break-keep text-center text-foreground select-none">
                {link.title}
              </span>
            </TransitionLink>
          ))}
        </div>
      </section>

      {EXTERNAL_LINK_SECTIONS.map((section) => (
        <ExternalLinkSection key={section.headingID} {...section} />
      ))}
    </>
  );
};

export default OrangeContent;
