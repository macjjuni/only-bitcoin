"use client";

import { Check, ChevronRight, MessageCircle, X } from "lucide-react";
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
import { pickBaristaGreeting, SPACE_BARISTA, SPACE_BARISTA_LINES } from "@/views/space/lib/barista";
import { useDismissOnOutsidePointer } from "@/views/space/lib/useDismissOnOutsidePointer";
import { useBaristaProximity } from "@/views/space/model/useBaristaProximity";
import { useTypewriter } from "@/views/space/model/useTypewriter";

const TALK_BUTTON_ID = "space-barista-talk";
const ICON_STROKE_WIDTH = 2;
/** 손가락 기기 크기. 데스크톱은 화면이 넓어 같은 크기면 작게 보여서 한 단계 키움. */
const ICON_SIZE = { coarse: 16, fine: 18 } as const;
/** 남은 시간을 다시 세는 간격(ms). 초 단위로 보여 줘서 이 정도면 됨. */
const COUNTDOWN_INTERVAL_MS = 500;
/** 아무도 곡을 안 바꿨을 때 틀고 있는 곡. */
const DEFAULT_TRACK: SpaceHallBgmTrack = "base";

/** 메뉴의 화면. 첫 화면에서 항목을 고르면 그 항목의 화면으로 들어감. */
type BaristaMenuView = "root" | "bgm";

/**
 * 선택지 한 줄. 고르려는 줄 앞에 ▶ 가 뜨는 게임 대화상자 모양임.
 *
 * 마우스를 올리거나 포커스가 가면 ▶ 가 보이고, 지금 고른 곡은 늘 보임.
 */
const CHOICE_CLASS =
  "group flex w-full items-center gap-2 rounded px-2 text-left text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-none disabled:opacity-45 disabled:hover:bg-transparent";
const CHOICE_CURSOR_CLASS =
  "shrink-0 text-bitcoin opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-disabled:opacity-0";

/**
 * 기기별 크기. 모바일 값이 기준이고 데스크톱은 글자·여백·너비를 한 단계씩 키움.
 *
 * 모바일 크기 그대로 데스크톱 화면 가운데에 띄우면 작아서 눈에 안 들어왔음.
 */
const SIZE_CLASS = {
  coarse: {
    box: "w-[min(21rem,calc(100vw-2rem))] px-4 pb-3 pt-7",
    name: "-top-4 px-3 py-1 text-sm",
    line: "min-h-[3rem] text-sm",
    choice: "py-2 text-sm",
    hint: "text-[11px]",
    talk: "px-4 py-2 text-sm",
  },
  fine: {
    box: "w-[30rem] max-w-[calc(100vw-2rem)] px-6 pb-4 pt-9",
    name: "-top-5 px-4 py-1 text-lg",
    line: "min-h-[4rem] text-lg",
    choice: "py-2.5 text-base",
    hint: "text-xs",
    talk: "px-5 py-2.5 text-base",
  },
} as const;

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
 * 바리스타 NPC 대화상자.
 *
 * 바리스타 가까이 가면 말 걸기 버튼이 뜨고, 누르면 게임 대화상자가 열림. 위에 이름표가
 * 붙고, 바리스타의 대사가 한 글자씩 찍힌 뒤 그 아래에서 선택지를 고름.
 * 첫 화면에는 할 수 있는 일(배경음악 설정 · 폭죽 터뜨리기)만 있고, 배경음악 설정을 누르면
 * 곡 목록으로 들어감. 곡을 고르거나 폭죽을 터뜨리면 창을 닫음 — 바뀐 걸 바로 듣고 보게 함.
 * 둘 다 방에 있는 모두에게 적용돼서 서버가 방 전체 쿨다운으로 막음.
 * 3D 모델을 직접 누르게 하지 않은 이유는 모바일에서 시야 드래그와 겹치기 때문임.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceBaristaMenu({ session, isCoarsePointer, onCelebrate }: SpaceBaristaMenuProps): ReactNode {
  // region [Hooks]
  const isNear = useBaristaProximity(session);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [view, setView] = useState<BaristaMenuView>("root");
  /** 이번에 건넨 인사말. 말을 걸 때마다 새로 고름. */
  const [greeting, setGreeting] = useState<string>(SPACE_BARISTA_LINES.greetings[0]);
  /** 지금의 서버 시각. 메뉴가 열려 있는 동안만 갱신해 남은 시간을 셈. */
  const [serverNow, setServerNow] = useState<number | null>(null);
  /**
   * 누가 마지막으로 폭죽을 직접 터뜨린 서버 시각. 쿨다운을 여기서 셈.
   *
   * 세션의 `celebration` 은 가장 최근 폭죽 하나만 들고 있음. 누가 터뜨린 직후 시세 폭죽이
   * 터지면 그걸로 덮여서, 따로 기억해 두지 않으면 쿨다운 중인데 버튼이 켜져 보임.
   */
  const [lastFireworksAt, setLastFireworksAt] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const clockOffsetRef = useRef(session.serverClockOffsetMs);
  const line = view === "root" ? greeting : SPACE_BARISTA_LINES.bgm;
  // 닫혀 있는 동안은 빈 글을 줘서, 다시 열 때 처음부터 찍히게 함.
  const typewriter = useTypewriter(isOpen ? line : "");

  clockOffsetRef.current = session.serverClockOffsetMs;
  // endregion


  // region [Privates]
  const refreshServerNow = useCallback((): void => {
    const clockOffset = clockOffsetRef.current;

    setServerNow(clockOffset === null ? null : performance.now() + clockOffset);
  }, []);

  const openMenu = useCallback((): void => {
    setGreeting(pickBaristaGreeting(Math.random()));
    setView("root");
    setIsOpen(true);
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
      if (isOpen) {
        setIsOpen(false);
      } else {
        openMenu();
      }
    };

    window.addEventListener("keydown", onKeyDownWindow);

    return () => {
      window.removeEventListener("keydown", onKeyDownWindow);
    };
  }, [isCoarsePointer, isNear, isOpen, openMenu]);

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
    if (isOpen) {
      setIsOpen(false);
    } else {
      openMenu();
    }
  }, [isOpen, openMenu]);

  const onClickClose = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const onClickOpenBgm = useCallback((): void => {
    setView("bgm");
  }, []);

  const onClickBack = useCallback((): void => {
    setView("root");
  }, []);

  const onClickTrack = (track: SpaceHallBgmTrack): void => {
    session.requestHallBgm(track);
    setIsOpen(false);
  };

  const onClickFireworks = useCallback((): void => {
    onCelebrate();
    setIsOpen(false);
  }, [onCelebrate]);
  // endregion


  // region [Life Cycles]
  // 여는 버튼은 빼야 열린 상태에서 그 버튼을 눌렀을 때 닫혔다 다시 열리지 않음.
  useDismissOnOutsidePointer(panelRef, isOpen, onClickClose, [TALK_BUTTON_ID]);

  useEffect(attachHotkey, [attachHotkey]);
  useEffect(startCountdown, [startCountdown]);

  useEffect(() => {
    // 시세가 터뜨린 폭죽은 쿨다운과 무관함. 누가 직접 터뜨린 것만 기억함.
    const celebration = session.celebration;

    if (celebration && celebration.testSeat !== undefined) {
      setLastFireworksAt((previousAt) => Math.max(previousAt ?? 0, celebration.startsAt));
    }
  }, [session.celebration]);

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

  const pointerKind = isCoarsePointer ? "coarse" : "fine";
  const sizeClass = SIZE_CLASS[pointerKind];
  const iconSize = ICON_SIZE[pointerKind];
  const choiceClass = `${CHOICE_CLASS} ${sizeClass.choice}`;
  const currentTrack = session.hallBgm?.track ?? DEFAULT_TRACK;
  const bgmWaitSeconds = resolveWaitSeconds(resolveHallBgmReadyAt(session.hallBgm), serverNow);
  const fireworksWaitSeconds =
    lastFireworksAt === null
      ? 0
      : resolveWaitSeconds(lastFireworksAt + SPACE_MARKET.testCooldownMs, serverNow);

  const RootChoicesTemplate = (
    <>
      {session.canChangeHallBgm && (
        <li>
          <button type="button" onClick={onClickOpenBgm} className={choiceClass}>
            <span aria-hidden="true" className={CHOICE_CURSOR_CLASS}>▶</span>
            <span className="flex-1">배경음악 설정</span>
            <ChevronRight size={iconSize} strokeWidth={ICON_STROKE_WIDTH} className="text-white/40" />
          </button>
        </li>
      )}

      {session.canSyncMarket && (
        <li>
          <button
            type="button"
            disabled={fireworksWaitSeconds > 0}
            onClick={onClickFireworks}
            className={choiceClass}
          >
            <span aria-hidden="true" className={CHOICE_CURSOR_CLASS}>▶</span>
            <span className="flex-1">폭죽 터뜨리기</span>
            {fireworksWaitSeconds > 0 && (
              <span className={`tabular-nums text-white/50 ${sizeClass.hint}`}>
                {fireworksWaitSeconds}초 뒤
              </span>
            )}
          </button>
        </li>
      )}

      <li>
        <button type="button" onClick={onClickClose} className={choiceClass}>
          <span aria-hidden="true" className={CHOICE_CURSOR_CLASS}>▶</span>
          <span className="flex-1 text-white/60">괜찮아요</span>
        </button>
      </li>
    </>
  );

  const BgmChoicesTemplate = (
    <>
      {SPACE_HALL_BGM_TRACKS.map((track) => {
        const isSelected = track === currentTrack;

        return (
          <li key={track}>
            <button
              type="button"
              disabled={bgmWaitSeconds > 0}
              aria-pressed={isSelected}
              onClick={() => onClickTrack(track)}
              className={`${choiceClass} ${isSelected ? "text-white" : ""}`}
            >
              <span aria-hidden="true" className={CHOICE_CURSOR_CLASS}>▶</span>
              <span className="flex-1">{SPACE_HALL_BGM_TRACK_LABELS[track]}</span>
              {isSelected && (
                <Check size={iconSize} strokeWidth={ICON_STROKE_WIDTH} className="text-bitcoin" />
              )}
            </button>
          </li>
        );
      })}

      <li>
        <button type="button" onClick={onClickBack} className={choiceClass}>
          <span aria-hidden="true" className={CHOICE_CURSOR_CLASS}>▶</span>
          <span className="flex-1 text-white/60">돌아가기</span>
        </button>
      </li>
    </>
  );

  // 쿨다운이나 마지막으로 바꾼 사람처럼 알릴 게 있을 때만 띄움.
  const bgmHint = [
    bgmWaitSeconds > 0 ? `${bgmWaitSeconds}초 뒤에 다시 바꿀 수 있어요.` : null,
    session.hallBgm ? `마지막으로 바꾼 사람: ${session.hallBgm.byNickname}` : null,
  ]
    .filter((part) => part !== null)
    .join(" ");
  const BgmHintTemplate =
    view === "bgm" && bgmHint !== "" ? (
      <p className={`mt-2 px-2 leading-snug text-white/45 ${sizeClass.hint}`}>{bgmHint}</p>
    ) : null;

  const DialogTemplate = isOpen ? (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`${SPACE_BARISTA.name}와 대화`}
      className={`relative rounded-lg border-2 border-white/70 bg-gradient-to-b from-[#24408f]/95 to-[#0d1740]/95 shadow-[0_0_0_3px_rgba(0,0,0,0.7),0_12px_32px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-xl ${sizeClass.box}`}
    >
      {/* 말하는 사람 이름표. 상자 위 테두리에 걸쳐 둠. 상자는 옛 RPG 대화창처럼 위가 밝은 남색이고,
          이름표는 같은 계열의 한 단계 밝은 파랑임. 주황은 ▶ · ✓ 같은 강조에만 씀. */}
      <span
        className={`absolute left-4 rounded border-2 border-white/70 bg-gradient-to-b from-[#4a74e0] to-[#2a4aa8] font-bold text-white shadow-[0_0_0_2px_rgba(0,0,0,0.7)] [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] ${sizeClass.name}`}
      >
        {SPACE_BARISTA.name}
      </span>

      <button
        type="button"
        onClick={onClickClose}
        aria-label="대화 닫기"
        className="absolute right-2 top-2 flex size-6 items-center justify-center rounded text-white/45 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin"
      >
        <X size={iconSize} strokeWidth={ICON_STROKE_WIDTH} />
      </button>

      {/* 대사. 누르면 남은 글을 한 번에 찍음. 읽어 주는 기기에는 전체 글을 한 번만 알림. */}
      <button
        type="button"
        onClick={typewriter.finish}
        aria-label={line}
        className={`relative block w-full cursor-default pr-6 text-left font-medium leading-relaxed text-white focus-visible:outline-none ${sizeClass.line}`}
      >
        <span aria-hidden="true">{typewriter.shownText}</span>
        {/* 글 끝에 붙이면 줄이 넘어가 상자가 늘어남. 대사 칸 오른쪽 아래에 따로 띄움. */}
        {typewriter.isDone && (
          <span aria-hidden="true" className="absolute bottom-0 right-0 animate-pulse text-bitcoin">
            ▼
          </span>
        )}
      </button>

      {/* 선택지는 대사가 찍히는 동안에도 바로 고를 수 있음. 열 때마다 기다리게 하면 답답함. */}
      <ul className="mt-2 flex flex-col border-t border-white/15 pt-2">
        {view === "root" ? RootChoicesTemplate : BgmChoicesTemplate}
      </ul>

      {BgmHintTemplate}
    </div>
  ) : null;
  // endregion

  return (
    <>
      {/*
        대화상자는 화면 가운데쯤에 띄움. 버튼 위로 펼치면 모바일에서 조이스틱을 덮었음.
        세로는 가운데 맞춤이 아니라 위쪽 끝을 고정함. 가운데로 맞추면 안내 줄이 생기거나 화면이
        바뀌어 상자 높이가 달라질 때마다 상자가 위아래로 움직여, 마우스 밑의 선택지가 바뀌었음.
        z-[35]: 씬 위에 뜨는 이름표·말풍선·피해 숫자(z 20 ~ 30)보다 위, 우측 상단 버튼(z-40)보다 아래.
      */}
      {isOpen && (
        <div className="pointer-events-auto absolute left-1/2 top-[30%] z-[35] -translate-x-1/2">
          {DialogTemplate}
        </div>
      )}

      <div
        className="pointer-events-auto absolute left-1/2 z-[35] -translate-x-1/2"
        style={{ bottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        {/* 대화상자와 같은 남색 상자 모양. 데스크톱은 누를 키를 자판 모양으로 보여 줌. */}
        <button
          id={TALK_BUTTON_ID}
          type="button"
          aria-expanded={isOpen}
          aria-label={`${SPACE_BARISTA.name}에게 말 걸기`}
          onClick={onClickTalk}
          className={`flex items-center gap-2 rounded-lg border-2 border-white/70 bg-gradient-to-b from-[#24408f]/95 to-[#0d1740]/95 font-bold text-white shadow-[0_0_0_3px_rgba(0,0,0,0.7),0_8px_20px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bitcoin ${sizeClass.talk}`}
        >
          <MessageCircle size={iconSize} strokeWidth={ICON_STROKE_WIDTH} className="text-bitcoin" />
          <span>말 걸기</span>
          {!isCoarsePointer && (
            <kbd className="rounded border border-black/40 bg-white px-1.5 font-sans text-xs font-bold leading-5 text-black shadow-[0_2px_0_rgba(0,0,0,0.45)]">
              T
            </kbd>
          )}
        </button>
      </div>
    </>
  );
}

const MemoizedSpaceBaristaMenu = memo(SpaceBaristaMenu);
MemoizedSpaceBaristaMenu.displayName = "SpaceBaristaMenu";

export default MemoizedSpaceBaristaMenu;
