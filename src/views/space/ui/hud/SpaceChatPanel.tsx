"use client";

import { Send, WifiOff, X } from "lucide-react";
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
  type SpaceChatMessage,
  type SpacePresence,
} from "@/entities/space";
import { countGraphemes } from "@/shared/lib/text/countGraphemes";

interface SpaceChatPanelProps {
  messages: readonly SpaceChatMessage[];
  presence: SpacePresence;
  nickname: string;
  error: string | null;
  isMessagePending: boolean;
  sendMessage: (body: string) => Promise<boolean>;
  onClose: () => void;
  onRetry: () => void;
  /** 손가락 기기는 입력칸을 화면 하단에 붙인 시트로 띄운다. */
  isBottomSheet: boolean;
}

// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceChatPanel({ messages, presence, nickname, error, isMessagePending, sendMessage, onClose, onRetry, isBottomSheet }: SpaceChatPanelProps): ReactNode {
  // region [Hooks]
  const [draft, setDraft] = useState("");
  const [cooldownEndsAt, setCooldownEndsAt] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [viewport, setViewport] = useState({ height: 720, bottomInset: 0 });
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
    if (!submittedDraft || countGraphemes(submittedDraft) > 300 || presence.status !== "online" || isSubmittingRef.current || isMessagePending || cooldownEndsAt > Date.now()) {
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
  useEffect(startViewportTracking, [startViewportTracking]);
  useEffect(followLatestMessages, [messages, followLatestMessages]);
  useEffect(startCooldownCountdown, [startCooldownCountdown]);
  // endregion


  // region [Templates]
  const characterCount = countGraphemes(draft);
  const isOnline = presence.status === "online";
  const canSend = isOnline && !isMessagePending && remainingSeconds === 0 && characterCount > 0 && characterCount <= 300;
  /**
   * 하단 시트는 화면 아래 모서리에 붙여 입력칸을 엄지 범위에 둔다.
   *
   * `absolute` 기준은 safe-area 패딩을 가진 HUD 루트의 패딩 박스라 `0` 이 이미
   * 안전 영역 안쪽이다. 키보드가 올라오면 그만큼 띄우되, 키보드가 safe-area 까지
   * 덮으므로 그 몫을 빼서 자판 위에 딱 붙인다.
   */
  const panelStyle = isBottomSheet
    ? {
        left: 0,
        right: 0,
        bottom: `max(0px, calc(${viewport.bottomInset}px - env(safe-area-inset-bottom)))`,
        maxHeight: Math.max(160, Math.min(420, viewport.height - 88)),
      }
    : {
        left: "calc(1rem + env(safe-area-inset-left))",
        maxWidth: "calc(100% - 2rem - env(safe-area-inset-left) - env(safe-area-inset-right))",
        bottom: `calc(1rem + env(safe-area-inset-bottom) + ${viewport.bottomInset}px)`,
        maxHeight: Math.max(140, Math.min(360, viewport.height - 96)),
      };
  const panelClassName = isBottomSheet
    ? "pointer-events-auto absolute z-30 flex flex-col overflow-hidden rounded-t-2xl border-t border-white/15 bg-[#10151f]/95 text-white shadow-2xl backdrop-blur-xl"
    : "pointer-events-auto absolute z-30 flex w-[340px] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#10151f]/95 text-white shadow-2xl backdrop-blur-xl";
  const sendLabel = isMessagePending ? "전송 중" : remainingSeconds > 0 ? `${remainingSeconds}초` : "보내기";
  const connectionLabel = isOnline ? `현재 공간 · ${presence.occupantCount}명` : "연결 대기 중";
  // endregion

  return (
    <section aria-label="공간 채팅" className={panelClassName} style={panelStyle}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold">공간 채팅</h2>
          <p className="mt-0.5 text-[11px] text-white/45">{connectionLabel}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="공간 채팅 닫기" className="flex size-9 items-center justify-center rounded-full text-white/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin">
          <X size={18} />
        </button>
      </div>

      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: The scrollable chat log needs keyboard scrolling. */}
      <div ref={logRef} role="log" aria-label="공간 대화" aria-live="polite" aria-relevant="additions" tabIndex={0} onScroll={onScrollLog} className="min-h-12 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3 text-[13px] leading-relaxed">
        {messages.length === 0 && <p className="py-3 text-center text-xs text-white/40">함께 전광판을 보며 이야기해 보세요.</p>}
        {messages.map((message) => (
          <p key={message.id} className="break-words whitespace-pre-wrap [overflow-wrap:anywhere]">
            <span className="mr-2 font-semibold text-bitcoin">{message.nickname}</span>
            <span className="text-white/85">{message.body}</span>
          </p>
        ))}
      </div>

      {error && <p role="status" className="px-4 pb-2 text-xs leading-relaxed text-amber-200">{error}</p>}
      {!isOnline && (
        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-2 text-xs text-white/55">
          <span className="flex items-center gap-1.5"><WifiOff size={13} />연결되면 대화할 수 있어요.</span>
          <button type="button" onClick={onRetry} disabled={presence.status === "connecting"} className="shrink-0 rounded px-1.5 py-1 text-bitcoin disabled:opacity-40">재연결</button>
        </div>
      )}

      <form onSubmit={onSubmitMessage} className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 pl-3 focus-within:border-bitcoin/60">
          <input ref={inputRef} aria-label="공간 메시지" value={draft} onChange={onChangeDraft} onKeyDown={onKeyDownChatInput} maxLength={8192} autoComplete="off" enterKeyHint="send" placeholder="메시지 입력" className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-white outline-none placeholder:text-white/30" />
          <button type="submit" aria-label={sendLabel} title={sendLabel} disabled={!canSend} className="m-1 flex h-9 min-w-9 items-center justify-center rounded-lg bg-bitcoin px-2 text-xs font-bold text-black transition-opacity disabled:opacity-30">
            {remainingSeconds > 0 ? sendLabel : <Send size={16} />}
          </button>
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-white/40">
          <span>{nickname} · 대화는 이 공간에서만 보여요</span>
          <span className={characterCount > 300 ? "text-amber-200" : undefined}>{characterCount}/300</span>
        </div>
      </form>
    </section>
  );
}

export default memo(SpaceChatPanel);
