"use client";

import { ChevronDown, ChevronUp, Send, WifiOff, X } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  SPACE_CHAT_COOLDOWN_MS,
  SPACE_CHAT_MAX_GRAPHEMES,
  type SpaceChatMessage,
  type SpacePresence,
} from "@/entities/space";
import { countGraphemes } from "@/shared/lib/text/countGraphemes";

/** 패널 밖에서 입력칸으로 포커스를 되돌릴 때 쓴다. */
export const SPACE_CHAT_INPUT_ID = "space-chat-input";

/** 같은 사람이 이 시간 안에 이어 보낸 말은 이름·시간을 한 번만 보여줌. */
const MESSAGE_GROUP_WINDOW_MS = 60_000;
/** 글자 수는 한도에 가까워질 때만 보여줌. */
const CHARACTER_COUNT_VISIBLE_FROM = SPACE_CHAT_MAX_GRAPHEMES - 20;
const messageTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const isContinuedMessage = (
  previousMessage: SpaceChatMessage | undefined,
  message: SpaceChatMessage,
): boolean => {
  return (
    previousMessage !== undefined &&
    previousMessage.seat === message.seat &&
    previousMessage.nickname === message.nickname &&
    message.createdAt - previousMessage.createdAt < MESSAGE_GROUP_WINDOW_MS
  );
};

interface SpaceChatPanelProps {
  messages: readonly SpaceChatMessage[];
  presence: SpacePresence;
  error: string | null;
  isMessagePending: boolean;
  sendMessage: (body: string) => Promise<boolean>;
  onClose: () => void;
  onRetry: () => void;
  /** 손가락 기기는 입력칸을 화면 하단에 붙인 시트로 띄운다. */
  isBottomSheet: boolean;
  /** 열자마자 입력칸에 포커스를 줄지. 손가락 기기는 자판이 화면 절반을 덮는다. */
  shouldAutoFocus: boolean;
}

// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceChatPanel({ messages, presence, error, isMessagePending, sendMessage, onClose, onRetry, isBottomSheet, shouldAutoFocus }: SpaceChatPanelProps): ReactNode {
  // region [Hooks]
  const [draft, setDraft] = useState("");
  const [cooldownEndsAt, setCooldownEndsAt] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [viewport, setViewport] = useState({ height: 720, bottomInset: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const shouldFollowLogRef = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);
  const isMountedRef = useRef(false);
  // endregion


  // region [Privates]
  const followLatestMessages = useCallback((): void => {
    const logElement = logRef.current;
    if (logElement && shouldFollowLogRef.current) {
      logElement.scrollTop = logElement.scrollHeight;
    }
  }, []);

  const startViewportTracking = useCallback((): (() => void) => {
    const visualViewport = window.visualViewport;
    const updateViewport = (): void => {
      const height = visualViewport?.height ?? window.innerHeight;
      const bottomInset = Math.max(0, window.innerHeight - height - (visualViewport?.offsetTop ?? 0));
      setViewport({ height, bottomInset });
    };
    updateViewport();
    visualViewport?.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    return () => {
      visualViewport?.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  const focusDraftInput = useCallback((): void => {
    if (shouldAutoFocus) {
      inputRef.current?.focus();
    }
  }, [shouldAutoFocus]);

  const trackMountedPanel = useCallback((): (() => void) => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const startCooldownCountdown = useCallback((): (() => void) | undefined => {
    if (cooldownEndsAt === 0) {
      return;
    }
    const updateCountdown = (): void => {
      setRemainingSeconds(Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000)));
    };
    updateCountdown();
    const intervalID = window.setInterval(updateCountdown, 250);
    const timeoutID = window.setTimeout(() => {
      setCooldownEndsAt(0);
      setRemainingSeconds(0);
    }, Math.max(0, cooldownEndsAt - Date.now()));
    return () => {
      window.clearInterval(intervalID);
      window.clearTimeout(timeoutID);
    };
  }, [cooldownEndsAt]);
  // endregion


  // region [Events]
  const onClickToggleExpand = useCallback((): void => {
    setIsExpanded((currentIsExpanded) => !currentIsExpanded);
  }, []);

  const onChangeDraft = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setDraft(event.target.value);
  }, []);

  const onScrollLog = useCallback((): void => {
    const logElement = logRef.current;
    if (logElement) {
      shouldFollowLogRef.current = logElement.scrollHeight - logElement.scrollTop - logElement.clientHeight < 48;
    }
  }, []);

  const onKeyDownChatInput = useCallback((event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Escape") {
      inputRef.current?.blur();
      onClose();
    }
    if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) {
      event.preventDefault();
    }
  }, [onClose]);

  const onSubmitMessage = useCallback(async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const submittedDraft = draft.trim();
    if (!submittedDraft || countGraphemes(submittedDraft) > SPACE_CHAT_MAX_GRAPHEMES || presence.status !== "online" || isSubmittingRef.current || isMessagePending || cooldownEndsAt > Date.now()) {
      return;
    }
    isSubmittingRef.current = true;
    let wasAccepted = false;
    try {
      wasAccepted = await sendMessage(submittedDraft);
    } finally {
      isSubmittingRef.current = false;
    }
    if (wasAccepted && isMountedRef.current) {
      setDraft((currentDraft) => currentDraft.trim() === submittedDraft ? "" : currentDraft);
      setCooldownEndsAt(Date.now() + SPACE_CHAT_COOLDOWN_MS);
      setRemainingSeconds(Math.ceil(SPACE_CHAT_COOLDOWN_MS / 1000));
      shouldFollowLogRef.current = true;
      followLatestMessages();
    }
  }, [draft, presence.status, isMessagePending, cooldownEndsAt, sendMessage, followLatestMessages]);
  // endregion


  // region [Life Cycles]
  useEffect(trackMountedPanel, [trackMountedPanel]);
  useEffect(focusDraftInput, [focusDraftInput]);
  useEffect(startViewportTracking, [startViewportTracking]);
  // 높이가 바뀌어도 맨 아래를 보던 중이면 최신 메시지에 붙여 둠.
  useEffect(followLatestMessages, [messages, isExpanded, followLatestMessages]);
  useEffect(startCooldownCountdown, [startCooldownCountdown]);
  // endregion


  // region [Templates]
  const characterCount = countGraphemes(draft);
  const isOnline = presence.status === "online";
  const canSend = isOnline && !isMessagePending && remainingSeconds === 0 && characterCount > 0 && characterCount <= SPACE_CHAT_MAX_GRAPHEMES;
  /**
   * 하단 시트는 화면 아래 모서리에 붙여 입력칸을 엄지 범위에 둔다.
   *
   * `absolute` 의 `bottom: 0` 은 HUD 루트 패딩 박스의 바깥 모서리, 즉 화면 맨 아래임.
   * 그래서 키보드가 없을 땐 홈 인디케이터만큼 안쪽 패딩을 줌. 키보드가 올라오면
   * 자판이 safe-area 까지 덮으니 키보드 높이만큼만 띄우고 패딩은 뺌.
   */
  // 일부 안드로이드는 키보드 없이도 1px 미만 오차가 남아 문턱을 둠.
  const isKeyboardOpen = viewport.bottomInset > 1;
  /**
   * 두 상태 모두 높이를 고정함. 최대 높이만 걸면 메시지가 쌓이는 동안 창이 계속
   * 커짐. 화면이 낮거나 키보드가 올라오면 viewport 높이에 맞춰 같이 줄어듦.
   */
  const panelHeight = isBottomSheet
    ? { height: Math.max(160, Math.min(isExpanded ? 600 : 320, viewport.height - 88)) }
    : { height: Math.max(140, Math.min(isExpanded ? 560 : 360, viewport.height - 96)) };
  const panelStyle = isBottomSheet
    ? {
        left: 0,
        right: 0,
        bottom: viewport.bottomInset,
        paddingBottom: isKeyboardOpen ? 0 : "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        ...panelHeight,
      }
    : {
        left: "calc(1rem + env(safe-area-inset-left))",
        maxWidth: "calc(100% - 2rem - env(safe-area-inset-left) - env(safe-area-inset-right))",
        bottom: `calc(1rem + env(safe-area-inset-bottom) + ${viewport.bottomInset}px)`,
        ...panelHeight,
      };
  const expandLabel = isExpanded ? "채팅창 줄이기" : "채팅창 늘리기";
  const panelClassName = isBottomSheet
    ? "pointer-events-auto absolute z-30 flex flex-col overflow-hidden rounded-t-2xl border-t border-white/10 bg-[#0d1119]/95 text-white shadow-2xl backdrop-blur-xl"
    : "pointer-events-auto absolute z-30 flex w-[340px] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d1119]/95 text-white shadow-2xl backdrop-blur-xl";
  const sendLabel = isMessagePending ? "전송 중" : remainingSeconds > 0 ? `${remainingSeconds}초` : "보내기";
  const isCharacterCountVisible = characterCount > CHARACTER_COUNT_VISIBLE_FROM;
  const isOverCharacterLimit = characterCount > SPACE_CHAT_MAX_GRAPHEMES;
  // endregion

  return (
    <section aria-label="공간 채팅" className={panelClassName} style={panelStyle}>
      <div className="flex items-center justify-between py-1.5 pl-4 pr-1.5">
        <h2 className="text-[13px] font-semibold text-white/80">채팅</h2>
        <div className="flex items-center">
          <button type="button" onClick={onClickToggleExpand} aria-label={expandLabel} title={expandLabel} aria-pressed={isExpanded} className="flex size-9 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin">
            {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <button type="button" onClick={onClose} aria-label="공간 채팅 닫기" className="flex size-9 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: The scrollable chat log needs keyboard scrolling. */}
      <div ref={logRef} role="log" aria-label="공간 대화" aria-live="polite" aria-relevant="additions" tabIndex={0} onScroll={onScrollLog} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-1 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin]">
        {messages.length === 0 && <p className="py-4 text-center text-xs text-white/35">함께 전광판을 보며 이야기해 보세요.</p>}
        <ol>
          {messages.map((message, index) => {
            const isContinued = isContinuedMessage(messages[index - 1], message);
            return (
              <li key={message.id} className={isContinued ? "mt-0.5" : "mt-3 first:mt-0"}>
                {!isContinued && (
                  <div className="mb-0.5 flex items-baseline gap-1.5">
                    <span className="truncate text-xs font-semibold text-bitcoin">{message.nickname}</span>
                    <time dateTime={new Date(message.createdAt).toISOString()} className="shrink-0 text-[10px] tabular-nums text-white/30">
                      {messageTimeFormatter.format(message.createdAt)}
                    </time>
                  </div>
                )}
                <p className="break-words whitespace-pre-wrap text-[13px] leading-relaxed text-white/85 [overflow-wrap:anywhere]">
                  {isContinued && <span className="sr-only">{message.nickname}: </span>}
                  {message.body}
                </p>
              </li>
            );
          })}
        </ol>
      </div>

      {error && <p role="status" className="px-4 pb-2 text-xs leading-relaxed text-amber-200">{error}</p>}
      {!isOnline && (
        <div className="flex items-center justify-between gap-2 px-4 pb-2 text-xs text-white/50">
          <span className="flex items-center gap-1.5"><WifiOff size={13} />연결되면 대화할 수 있어요.</span>
          <button type="button" onClick={onRetry} disabled={presence.status === "connecting"} className="shrink-0 rounded px-1.5 py-1 font-semibold text-bitcoin disabled:opacity-40">재연결</button>
        </div>
      )}

      <form onSubmit={onSubmitMessage} className="flex items-center gap-2 border-t border-white/[0.07] p-2.5">
        <div className="flex min-w-0 flex-1 items-center rounded-full bg-white/[0.06] pl-4 pr-3 transition-colors focus-within:bg-white/10 focus-within:ring-1 focus-within:ring-bitcoin/50">
          <input ref={inputRef} id={SPACE_CHAT_INPUT_ID} aria-label="공간 메시지" value={draft} onChange={onChangeDraft} onKeyDown={onKeyDownChatInput} maxLength={8192} autoComplete="off" enterKeyHint="send" placeholder="메시지 입력" className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-white outline-none placeholder:text-white/30" />
          {isCharacterCountVisible && (
            <span className={`ml-2 shrink-0 text-[10px] tabular-nums ${isOverCharacterLimit ? "text-amber-200" : "text-white/40"}`}>
              {characterCount}/{SPACE_CHAT_MAX_GRAPHEMES}
            </span>
          )}
        </div>
        <button type="submit" aria-label={sendLabel} title={sendLabel} disabled={!canSend} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bitcoin text-xs font-bold text-black transition-opacity disabled:opacity-30">
          {remainingSeconds > 0 ? sendLabel : <Send size={16} />}
        </button>
      </form>
    </section>
  );
}

export default memo(SpaceChatPanel);
