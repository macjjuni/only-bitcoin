"use client";

import { Heart, Skull, Swords, Timer } from "lucide-react";
import { type CSSProperties, memo, type ReactNode, useEffect, useMemo, useState } from "react";
import type { SpaceBossDefeat, SpaceSession } from "@/features/space-session";
import { formatBossCountdown } from "@/views/space/lib/bossHud";
import { useBossHud } from "@/views/space/model/useBossHud";

/** 보스 이름. 하락에 베팅하는 숏 곰들의 왕임. */
const BOSS_NAME = "숏베어킹";
/** 처치 결과를 띄워 두는 시간(ms). */
const DEFEAT_RESULT_DURATION_MS = 9_000;
/** 내 체력이 이 비율 아래면 체력바를 위험 색으로 바꿈. */
const LOW_HEALTH_RATIO = 0.3;

interface SpaceBossHudProps {
  session: SpaceSession;
  /** 손가락 기기인지. 좌측 상단 대화 내역과 겹치지 않게 보스 체력바를 내림. */
  isCoarsePointer: boolean;
}

/**
 * 보스 전투 UI.
 *
 * 전부 읽기 전용이라 터치를 막지 않음. 막으면 떠 있는 동안 그 자리의 시야 조작이 죽음.
 * 색·크기는 HUD 의 다른 패널(인원 배지, 조작 안내)과 같은 반투명 검정 판을 씀.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceBossHud({ session, isCoarsePointer }: SpaceBossHudProps): ReactNode {
  // region [Hooks]
  const view = useBossHud(session);
  /** 화면에 띄우고 있는 처치 결과. 시간이 지나면 내림. */
  const [shownDefeat, setShownDefeat] = useState<SpaceBossDefeat | null>(null);
  const { bossDefeat, selfDamagedAt } = session;
  // endregion


  // region [Privates]
  const resolveNickname = (seat: number): string => {
    if (session.self?.seat === seat) {
      return session.self.nickname;
    }

    return session.remotePlayers.find((player) => player.seat === seat)?.nickname ?? "떠난 사람";
  };

  /** 새 처치 소식이 오면 결과를 띄우고 잠시 뒤 내림. */
  const showDefeatResult = (): (() => void) | undefined => {
    if (!bossDefeat) {
      setShownDefeat(null);
      return;
    }

    setShownDefeat(bossDefeat);
    const timeoutID = window.setTimeout(() => {
      setShownDefeat(null);
    }, DEFEAT_RESULT_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutID);
    };
  };
  // endregion


  // region [Life Cycles]
  useEffect(showDefeatResult, [bossDefeat]);
  // endregion


  // region [Templates]
  /** 손가락 기기는 좌측 상단에 대화 내역(높이 112 px)이 있어 그 아래로 내림. */
  const topStyle = useMemo((): CSSProperties => {
    return { top: `calc(${isCoarsePointer ? "9.25rem" : "1rem"} + env(safe-area-inset-top))` };
  }, [isCoarsePointer]);

  const BossBarTemplate = view.bossBar ? (
    <div className="w-[min(420px,calc(100vw-2rem))] rounded-xl bg-black/65 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-white/90">
          <Swords size={13} className="shrink-0 text-red-400" />
          {BOSS_NAME}
        </span>
        <span className="text-[11px] font-semibold tabular-nums text-white/60">
          {view.bossBar.health.toLocaleString()} / {view.bossBar.maximumHealth.toLocaleString()}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${BOSS_NAME} 체력`}
        aria-valuemin={0}
        aria-valuemax={view.bossBar.maximumHealth}
        aria-valuenow={view.bossBar.health}
        className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-[width] duration-300 ease-out"
          style={{ width: `${view.bossBar.ratio * 100}%` }}
        />
      </div>
    </div>
  ) : null;

  const NextSpawnTemplate =
    view.nextSpawnSeconds !== null ? (
      <div className="flex items-center gap-2 rounded-full bg-black/55 py-1.5 pl-2.5 pr-3 backdrop-blur-sm">
        <Timer size={13} className="shrink-0 text-white/60" />
        <span className="text-xs font-semibold text-white/85">
          다음 {BOSS_NAME} 등장까지{" "}
          <span className="tabular-nums text-bitcoin">
            {formatBossCountdown(view.nextSpawnSeconds)}
          </span>
        </span>
      </div>
    ) : null;

  const isLowHealth = (view.playerBar?.ratio ?? 1) <= LOW_HEALTH_RATIO;
  const PlayerBarTemplate = view.playerBar ? (
    <div className="flex w-[min(240px,calc(100vw-13rem))] items-center gap-2 rounded-full bg-black/60 py-1.5 pl-2.5 pr-3 backdrop-blur-sm">
      <Heart
        size={14}
        className={`shrink-0 ${isLowHealth ? "animate-pulse text-red-400" : "text-emerald-400"}`}
        fill="currentColor"
      />
      <div
        role="progressbar"
        aria-label="내 체력"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={view.playerBar.health}
        className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${isLowHealth ? "bg-red-400" : "bg-emerald-400"}`}
          style={{ width: `${view.playerBar.ratio * 100}%` }}
        />
      </div>
      <span className="w-7 text-right text-xs font-bold tabular-nums text-white/90">
        {view.playerBar.health}
      </span>
    </div>
  ) : null;

  /** 맞을 때마다 키가 바뀌어 번쩍임이 처음부터 다시 재생됨. */
  const HitFlashTemplate =
    selfDamagedAt !== null ? (
      <div
        key={selfDamagedAt}
        aria-hidden="true"
        className="space-hit-flash absolute inset-0 shadow-[inset_0_0_120px_40px_rgba(220,38,38,0.55)]"
      />
    ) : null;

  const KnockoutTemplate =
    view.knockoutSeconds !== null ? (
      <div
        role="status"
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-[2px]"
      >
        <Skull size={44} className="text-red-400" />
        <p className="text-2xl font-bold text-white">쓰러졌습니다</p>
        <p className="text-sm text-white/70">
          <span className="font-bold tabular-nums text-white">{view.knockoutSeconds}</span>초 뒤 홀에서
          다시 일어납니다
        </p>
      </div>
    ) : null;

  const DefeatResultTemplate = shownDefeat ? (
    <div
      role="status"
      className="absolute left-1/2 top-1/2 w-[min(320px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-black/75 p-4 backdrop-blur-sm"
    >
      <p className="text-center text-base font-bold text-bitcoin">{BOSS_NAME} 처치!</p>
      <p className="mt-1 text-center text-xs text-white/70">
        막타 <span className="font-bold text-white">{resolveNickname(shownDefeat.lastHitSeat)}</span>
      </p>
      <ol className="mt-3 flex flex-col gap-1">
        {shownDefeat.ranking.map(({ seat, damage }, index) => (
          <li key={seat} className="flex items-baseline justify-between gap-2 text-xs">
            <span className="min-w-0 truncate text-white/85">
              <span className="mr-1.5 inline-block w-3 font-bold tabular-nums text-white/50">
                {index + 1}
              </span>
              {resolveNickname(seat)}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-white/70">
              {damage.toLocaleString()}
            </span>
          </li>
        ))}
      </ol>
    </div>
  ) : null;
  // endregion

  return (
    <div className="pointer-events-none absolute inset-0">
      {HitFlashTemplate}

      <div className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-2" style={topStyle}>
        {BossBarTemplate}
        {NextSpawnTemplate}
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        {PlayerBarTemplate}
      </div>

      {DefeatResultTemplate}
      {KnockoutTemplate}
    </div>
  );
}

const MemoizedSpaceBossHud = memo(SpaceBossHud);
MemoizedSpaceBossHud.displayName = "SpaceBossHud";

export default MemoizedSpaceBossHud;
