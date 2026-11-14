"use client";

import { Check, Coffee, Music, PartyPopper } from "lucide-react";
import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  resolveHallBgmReadyAt,
  SPACE_HALL_BGM_TRACKS,
  SPACE_MARKET,
  type SpaceHallBgmTrack,
} from "@/entities/space";
import { SPACE_HALL_BGM_TRACK_LABELS } from "@/features/space-bgm";
import { shouldIgnoreSpaceHotkey } from "@/features/space-controls";
import type { SpaceSession } from "@/features/space-session";
import { SPACE_BARISTA } from "@/views/space/lib/barista";
import { useDismissOnOutsidePointer } from "@/views/space/lib/useDismissOnOutsidePointer";
import { useBaristaProximity } from "@/views/space/model/useBaristaProximity";

const TALK_BUTTON_ID = "space-barista-talk";
const ICON_SIZE = 16;
const ICON_STROKE_WIDTH = 2;
/** 남은 시간을 다시 세는 간격(ms). 초 단위로 보여 줘서 이 정도면 됨. */
const COUNTDOWN_INTERVAL_MS = 500;
/** 아무도 곡을 안 바꿨을 때 틀고 있는 곡. */
const DEFAULT_TRACK: SpaceHallBgmTrack = "base";

interface SpaceBaristaMenuProps {
  session: SpaceSession;
  isCoarsePointer: boolean;
  /** 폭죽을 터뜨림. 방 전체에 터지고 쿨다운은 서버가 봄. */
  onCelebrate: () => void;
}

// region [Privates]
/** `readyAt`(서버 시각)까지 남은 초. 지났거나 시계를 모르면 0. */
const resolveWaitSeconds = (readyAt: number, serverNow: number | null): number => {
  return serverNow === null ? 0 : Math.max(0, Math.ceil((readyAt - serverNow) / 1000));
};
// endregion

/**
 * 바리스타 NPC 메뉴.
 *
 * 바리스타 가까이 가면 말 걸기 버튼이 뜨고, 누르면 홀 배경음악을 고르거나 폭죽을 터뜨리는
 * 메뉴가 열림. 둘 다 방에 있는 모두에게 적용돼서 서버가 방 전체 쿨다운으로 막음.
 * 3D 모델을 직접 누르게 하지 않은 이유는 모바일에서 시야 드래그와 겹치기 때문임.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceBaristaMenu({ session, isCoarsePointer, onCelebrate }: SpaceBaristaMenuProps): ReactNode {
  // region [Hooks]
  const isNear = useBaristaProximity(session);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  /** 지금의 서버 시각. 메뉴가 열려 있는 동안만 갱신해 남은 시간을 셈. */
  const [serverNow, setServerNow] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const clockOffsetRef = useRef(session.serverClockOffsetMs);

  clockOffsetRef.current = session.serverClockOffsetMs;
  // endregion


  // region [Privates]
  const refreshServerNow = useCallback((): void => {
    const clockOffset = clockOffsetRef.current;

    setServerNow(clockOffset === null ? null : performance.now() + clockOffset);
  }, []);

  /** 데스크톱에서 T 로 말을 걸고(F 는 공격임) Esc 로 닫음. 글자를 치는 중이면 흘려보냄. */
  const attachHotkey = useCallback((): (() => void) | undefined => {
    if (isCoarsePointer || !isNear) {
      return;
    }

    const onKeyDownWindow = (event: KeyboardEvent): void => {
      if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (event.code !== "KeyT" || shouldIgnoreSpaceHotkey(event.target)) {
        return;
      }

      event.preventDefault();
      setIsOpen((previousOpen) => !previousOpen);
    };

    window.addEventListener("keydown", onKeyDownWindow);

    return () => {
      window.removeEventListener("keydown", onKeyDownWindow);
    };
  }, [isCoarsePointer, isNear]);

  const startCountdown = useCallback((): (() => void) | undefined => {
    if (!isOpen) {
      return;
    }

    refreshServerNow();
    const intervalID = window.setInterval(refreshServerNow, COUNTDOWN_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalID);
    };
  }, [isOpen, refreshServerNow]);
  // endregion


  // region [Events]
  const onClickTalk = useCallback((): void => {
    setIsOpen((previousOpen) => !previousOpen);
  }, []);

  const onClickClose = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const onClickTrack = (track: SpaceHallBgmTrack): void => {
    session.requestHallBgm(track);
  };

  const onClickFireworks = useCallback((): void => {
    onCelebrate();
  }, [onCelebrate]);
  // endregion


  // region [Life Cycles]
  // 여는 버튼은 빼야 열린 상태에서 그 버튼을 눌렀을 때 닫혔다 다시 열리지 않음.
  useDismissOnOutsidePointer(panelRef, isOpen, onClickClose, [TALK_BUTTON_ID]);

  useEffect(attachHotkey, [attachHotkey]);
  useEffect(startCountdown, [startCountdown]);

  useEffect(() => {
    // 자리를 뜨면 닫음. 멀리서 메뉴만 들고 다니지 않게 함.
    if (!isNear) {
      setIsOpen(false);
    }
  }, [isNear]);
  // endregion


  // region [Templates]
  if (!isNear) {
    return null;
  }

  const currentTrack = session.hallBgm?.track ?? DEFAULT_TRACK;
  const bgmWaitSeconds = resolveWaitSeconds(resolveHallBgmReadyAt(session.hallBgm), serverNow);
  // 시세가 터뜨린 폭죽은 쿨다운과 무관함. 누가 직접 터뜨린 것만 셈.
  const lastFireworksAt =
    session.celebration?.testSeat === undefined ? null : session.celebration.startsAt;
  const fireworksWaitSeconds =
    lastFireworksAt === null
      ? 0
      : resolveWaitSeconds(lastFireworksAt + SPACE_MARKET.testCooldownMs, serverNow);

  const BgmSectionTemplate = session.canChangeHallBgm ? (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-white/85">
        <Music size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />
        <span>홀 배경음악</span>
      </div>

      {SPACE_HALL_BGM_TRACKS.map((track) => {
        const isSelected = track === currentTrack;

        return (
          <button
            key={track}
            type="button"
            disabled={bgmWaitSeconds > 0}
            aria-pressed={isSelected}
            onClick={() => onClickTrack(track)}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin disabled:opacity-50 ${
              isSelected
                ? "border-bitcoin/70 bg-bitcoin/15 text-white"
                : "border-white/10 bg-white/5 text-white/80"
            }`}
          >
            <span>{SPACE_HALL_BGM_TRACK_LABELS[track]}</span>
            {isSelected && <Check size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />}
          </button>
        );
      })}

      <p className="text-[11px] leading-snug text-white/50">
        {bgmWaitSeconds > 0
          ? `${bgmWaitSeconds}초 뒤에 다시 바꿀 수 있어요.`
          : "홀에 있는 모두에게 같이 바뀌어요."}
        {session.hallBgm ? ` 마지막으로 바꾼 사람: ${session.hallBgm.byNickname}` : ""}
      </p>
    </section>
  ) : null;

  const FireworksSectionTemplate = session.canSyncMarket ? (
    <button
      type="button"
      disabled={fireworksWaitSeconds > 0}
      onClick={onClickFireworks}
      className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin disabled:opacity-50"
    >
      <PartyPopper size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />
      <span>
        {fireworksWaitSeconds > 0 ? `폭죽 (${fireworksWaitSeconds}초 뒤)` : "폭죽 터뜨리기"}
      </span>
    </button>
  ) : null;

  const PanelTemplate = isOpen ? (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`${SPACE_BARISTA.name} 메뉴`}
      className="flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl border border-white/15 bg-[#10151f]/95 p-3 shadow-lg backdrop-blur-xl"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/85">{SPACE_BARISTA.name}</span>
        <button
          type="button"
          onClick={onClickClose}
          className="rounded px-1 text-xs text-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin"
        >
          닫기
        </button>
      </div>

      {BgmSectionTemplate}

      {FireworksSectionTemplate}
    </div>
  ) : null;
  // endregion

  return (
    <div
      className="pointer-events-auto absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
      style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
    >
      {PanelTemplate}

      <button
        id={TALK_BUTTON_ID}
        type="button"
        aria-expanded={isOpen}
        onClick={onClickTalk}
        className="flex items-center gap-1.5 rounded-full border border-white/20 bg-[#10151f]/90 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin"
      >
        <Coffee size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />
        <span>{isCoarsePointer ? "말 걸기" : "말 걸기 (T)"}</span>
      </button>
    </div>
  );
}

const MemoizedSpaceBaristaMenu = memo(SpaceBaristaMenu);
MemoizedSpaceBaristaMenu.displayName = "SpaceBaristaMenu";

export default MemoizedSpaceBaristaMenu;
