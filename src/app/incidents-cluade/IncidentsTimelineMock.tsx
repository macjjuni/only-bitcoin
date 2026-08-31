"use client";

import { SquareArrowOutUpRight } from "lucide-react";
import { useScrollDirection } from "@/shared/lib/hooks";
import {
  FIRST_YEAR,
  getAmountRatio,
  type Incident,
  type IncidentType,
  LAST_YEAR,
  TOTAL_COUNT,
  TYPE_LABEL,
  updatedAt,
  YEAR_GROUPS,
} from "./model";

/**
 * 시안 전용 색 토큰.
 *
 * 전역 변수에는 코랄/퍼플/틸 계열이 없어 이 화면 스코프(`.incidents-mock`)에만 정의함.
 * 라이트는 "같은 계열의 가장 진한 톤"을 글자색으로 쓰고, 다크는 배경이 뒤집히므로
 * 같은 계열의 밝은 톤으로 갈아끼워 대비를 유지함.
 */
const SCOPED_STYLE = `
.incidents-mock {
  --inc-text: #17181a;
  --inc-text-sub: #5c6066;
  --inc-text-muted: #9096a0;
  --inc-line: #e2e5ea;
  --inc-track: #eceef2;
  --inc-border: #dcdfe5;

  --inc-hack-bg: #fdeceb;
  --inc-hack-fg: #8c2f26;
  --inc-hack-bar: #e4574c;

  --inc-halt-bg: #efeafa;
  --inc-halt-fg: #442a8a;
  --inc-halt-bar: #7c5cd6;

  --inc-bankruptcy-bg: #fbf0dd;
  --inc-bankruptcy-fg: #6f4708;
  --inc-bankruptcy-bar: #c0821a;

  --inc-operational-bg: #eceef1;
  --inc-operational-fg: #3c434c;
  --inc-operational-bar: #78828f;

  --inc-protocol-bg: #e6eefa;
  --inc-protocol-fg: #1c3f78;
  --inc-protocol-bar: #3d76cc;

  --inc-local-bg: #e4f3f1;
  --inc-local-fg: #145c56;
}
:where(.dark) .incidents-mock {
  --inc-text: #f2f3f5;
  --inc-text-sub: #a8adb5;
  --inc-text-muted: #71767e;
  --inc-line: #2c2e33;
  --inc-track: #26282c;
  --inc-border: #34373d;

  --inc-hack-bg: rgb(228 87 76 / 0.16);
  --inc-hack-fg: #ff9a90;
  --inc-hack-bar: #e4574c;

  --inc-halt-bg: rgb(124 92 214 / 0.18);
  --inc-halt-fg: #bfa8ff;
  --inc-halt-bar: #8b6ce0;

  --inc-bankruptcy-bg: rgb(192 130 26 / 0.18);
  --inc-bankruptcy-fg: #f0c069;
  --inc-bankruptcy-bar: #d1912b;

  --inc-operational-bg: rgb(120 130 143 / 0.2);
  --inc-operational-fg: #b5bdc8;
  --inc-operational-bar: #8b95a3;

  --inc-protocol-bg: rgb(61 118 204 / 0.2);
  --inc-protocol-fg: #94b8f2;
  --inc-protocol-bar: #4d84d8;

  --inc-local-bg: rgb(43 156 146 / 0.16);
  --inc-local-fg: #6fd8cd;
}
`;

const FILTERS = ["전체", "해킹", "출금중지", "국내"] as const;

/** 유형별 배지·막대 색 토큰. */
const TYPE_TOKEN: Record<IncidentType, { bg: string; fg: string; bar: string }> = {
  hack: { bg: "var(--inc-hack-bg)", fg: "var(--inc-hack-fg)", bar: "var(--inc-hack-bar)" },
  halt: { bg: "var(--inc-halt-bg)", fg: "var(--inc-halt-fg)", bar: "var(--inc-halt-bar)" },
  bankruptcy: {
    bg: "var(--inc-bankruptcy-bg)",
    fg: "var(--inc-bankruptcy-fg)",
    bar: "var(--inc-bankruptcy-bar)",
  },
  operational: {
    bg: "var(--inc-operational-bg)",
    fg: "var(--inc-operational-fg)",
    bar: "var(--inc-operational-bar)",
  },
  protocol: {
    bg: "var(--inc-protocol-bg)",
    fg: "var(--inc-protocol-fg)",
    bar: "var(--inc-protocol-bar)",
  },
};

/**
 * 유형 배지 옆 부가 태그.
 *
 * '국내' 만 색(틸)으로 두고 북한 연계 계열은 아웃라인으로 뺐다. 채운 배지로 만들면
 * 바로 옆 유형 배지와 위계가 같아져 어느 쪽이 사고 유형인지 읽히지 않는다.
 */
const BADGE_BASE = "inline-flex items-center rounded px-1.5 py-[3px] text-[11px] font-medium";

function TypeBadge({ type }: { type: IncidentType }) {
  const token = TYPE_TOKEN[type];

  return (
    <span
      className={`${BADGE_BASE} leading-none`}
      style={{ backgroundColor: token.bg, color: token.fg }}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}

function TagBadge({ label }: { label: string }) {
  if (label === "국내") {
    return (
      <span
        className={`${BADGE_BASE} leading-none`}
        style={{ backgroundColor: "var(--inc-local-bg)", color: "var(--inc-local-fg)" }}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`${BADGE_BASE} border leading-[1.05]`}
      style={{ borderColor: "var(--inc-border)", color: "var(--inc-text-sub)" }}
    >
      {label}
    </span>
  );
}

/** 타임라인 레일. 폭 12px 안에 원형 노드와 아래로 이어지는 1px 세로선을 담음. */
function Rail({ isMajor, hasLine }: { isMajor?: boolean; hasLine: boolean }) {
  const size = isMajor ? 14 : 10;

  return (
    <div className="flex w-3 shrink-0 flex-col items-center pt-[5px]">
      <span
        className="block shrink-0 rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: isMajor ? "var(--inc-text)" : "var(--inc-line)",
        }}
      />
      {hasLine && (
        <span className="mt-1.5 w-px flex-1" style={{ backgroundColor: "var(--inc-line)" }} />
      )}
    </div>
  );
}

/** 피해액 비례 막대 + 오른쪽 금액 문구. */
function DamageBar({ incident }: { incident: Incident }) {
  // 금액이 없는 건(‘고객 자산 손실 없음’)은 막대 없이 문구만 남긴다.
  if (!incident.amount) {
    return (
      <span className="text-[12px] leading-none" style={{ color: "var(--inc-text-muted)" }}>
        {incident.amountText}
      </span>
    );
  }

  const ratio = getAmountRatio(incident.amount);

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--inc-track)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(ratio * 100, 2)}%`,
            backgroundColor: TYPE_TOKEN[incident.type].bar,
          }}
        />
      </div>
      <span
        className="shrink-0 text-[12px] font-medium leading-none tabular-nums"
        style={{ color: "var(--inc-text)" }}
      >
        {incident.amountText}
      </span>
    </div>
  );
}

/**
 * 관련 기사 칩.
 *
 * URL 은 길이가 제각각이라 카드 리듬을 깨서 노출하지 않고, 필터 칩과 같은 pill 로 묶어
 * 외부 이동 아이콘 + 문구만 남겼다.
 */
function ArticleChip({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-[6px]
        text-[12px] font-medium leading-none no-underline"
      style={{ backgroundColor: "var(--inc-track)", color: "var(--inc-text)" }}
    >
      <SquareArrowOutUpRight size={12} strokeWidth={2} aria-hidden />
      관련기사
    </a>
  );
}

/**
 * 사건 항목.
 *
 * 카드(테두리·배경) 없이 여백으로만 구분한다. `featured` 는 레일 노드가 커지고
 * 그 아래에 상세 설명과 관련 기사 칩이 이어 붙는다.
 */
function IncidentCard({ incident }: { incident: Incident }) {
  return (
    <div className="flex flex-col gap-[7px] pb-6">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="font-number text-[12px] leading-none tabular-nums"
          style={{ color: "var(--inc-text-muted)" }}
        >
          {incident.date.slice(5, 7)}월
        </span>
        <TypeBadge type={incident.type} />
        {incident.tags?.map((tag) => (
          <TagBadge key={tag} label={tag} />
        ))}
      </div>

      <div className="flex flex-wrap items-baseline gap-1.5">
        <span className="text-[15px] font-medium leading-none" style={{ color: "var(--inc-text)" }}>
          {incident.name}
        </span>
        <span className="text-[13px] leading-none" style={{ color: "var(--inc-text-muted)" }}>
          {incident.country}
        </span>
      </div>

      <p className="text-[13px] leading-[1.5]" style={{ color: "var(--inc-text-sub)" }}>
        {incident.summary}
      </p>

      <div className="pt-0.5">
        <DamageBar incident={incident} />
      </div>

      {incident.featured && (
        <div className="mt-1.5 flex flex-col items-start gap-3">
          {incident.detail && (
            <p className="text-[13px] leading-[1.6]" style={{ color: "var(--inc-text-sub)" }}>
              {incident.detail}
            </p>
          )}
          <ArticleChip href={incident.article} />
        </div>
      )}
    </div>
  );
}

export default function IncidentsTimelineMock() {
  // region [Hooks]
  const isHeaderHidden = useScrollDirection();
  // endregion

  /**
   * 연도 스티키는 앱 헤더 바로 아래에 붙는다.
   *
   * - 높이를 `h-header` 로 맞춰 헤더와 같은 두께로 둠.
   * - 헤더가 스크롤로 접히면(`isHeaderHidden`) 그 자리에 50px 빈틈이 생기므로 `top-0` 으로 끌어올림.
   *   전환 곡선은 헤더(`Header.tsx`)와 동일하게 맞춰 두 요소가 같이 움직이도록 함.
   * - z 는 헤더(`z-10`)보다 낮게 둬야 함. 연도가 바뀌는 구간에서 이전 연도가 sticky 하단 제약에
   *   밀려 헤더 영역까지 올라오는데, 이때 헤더 위로 그려지면 안 되고 뒤로 사라져야 한다.
   * - 배경색 대신 `backdrop-blur` 로 처리한다. 색 띠를 깔지 않으면서도 고정된 동안
   *   아래로 지나가는 내용이 흐려져 연도 숫자가 읽힌다.
   */
  const stickyClassName = [
    "sticky z-[1] flex h-header items-center backdrop-blur-md",
    "transition-[top] duration-[420ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]",
    isHeaderHidden ? "top-0" : "top-header",
  ].join(" ");

  const lastGroupIndex = YEAR_GROUPS.length - 1;

  return (
    <>
      <style>{SCOPED_STYLE}</style>

      {/* region [상단 헤더] */}
      <div className="flex flex-col gap-3.5 px-1 pt-1">
        <div className="flex flex-col gap-2">
          <h1
            className="text-[22px] font-bold leading-none tracking-[-0.5px]"
            style={{ color: "var(--inc-text)" }}
          >
            거래소 사고 연표
          </h1>
          <p className="text-[13px] leading-none" style={{ color: "var(--inc-text-muted)" }}>
            {FIRST_YEAR} – {LAST_YEAR} · {TOTAL_COUNT}건
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((filter) => {
            const isActive = filter === "전체";

            return (
              <span
                key={filter}
                className="inline-flex items-center rounded-full px-3 py-[7px] text-[13px] leading-none"
                style={
                  isActive
                    ? { backgroundColor: "var(--inc-text)", color: "hsl(var(--background))" }
                    : { backgroundColor: "var(--inc-track)", color: "var(--inc-text-sub)" }
                }
              >
                {filter}
              </span>
            );
          })}
        </div>
      </div>
      {/* endregion */}

      {/* region [타임라인] */}
      <div className="mt-1 flex flex-col px-1">
        {YEAR_GROUPS.map((group, groupIndex) => (
          <section key={group.year}>
            <div className={stickyClassName}>
              <div className="flex items-baseline gap-2" style={{ color: "var(--inc-text)" }}>
                <span className="font-number text-[26px] font-bold leading-none tracking-[-1px] tabular-nums">
                  {group.year}
                </span>
                <span
                  className="text-[12px] leading-none"
                  style={{ color: "var(--inc-text-muted)" }}
                >
                  {group.incidents.length}건
                </span>
              </div>
            </div>

            {group.incidents.map((incident, index) => {
              const isLastCard =
                groupIndex === lastGroupIndex && index === group.incidents.length - 1;

              return (
                <div key={incident.id} className="flex gap-3">
                  <Rail isMajor={incident.featured} hasLine={!isLastCard} />
                  <div className="min-w-0 flex-1">
                    <IncidentCard incident={incident} />
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>
      {/* endregion */}

      {/* region [각주] */}
      <div className="flex flex-col gap-1.5 px-1 pb-1">
        <span className="text-[11px] leading-none" style={{ color: "var(--inc-text-muted)" }}>
          {updatedAt} 기준
        </span>
        {/* `amountNote` 는 구현자용 문구라 사용자에게 보일 부분만 옮겨 적음. */}
        <p className="text-[11px] leading-[1.6]" style={{ color: "var(--inc-text-muted)" }}>
          피해액은 원화 기준 추정치입니다. 달러 표기 사건은 약 1,380원/USD로 환산했으며 집계
          기관마다 편차가 있습니다. 막대 길이는 규모 차이가 270배에 달해 제곱근 스케일로 그렸습니다.
        </p>
      </div>
      {/* endregion */}
    </>
  );
}
