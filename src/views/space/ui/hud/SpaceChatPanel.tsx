"use client";

import { Eye, EyeOff, WifiOff } from "lucide-react";
import {
  type MouseEvent,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { SpaceChatMessage, SpacePresence } from "@/entities/space";
import { resolvePresenceDisplay } from "@/views/space/lib/presenceLabel";
import SpaceChatComposer from "./SpaceChatComposer";

/** 내역 숨김은 이 브라우저에만 기억함. 다음에 들어와도 그대로 둠. */
const LOG_HIDDEN_STORAGE_KEY = "only-btc.space.chat-log-hidden";
const CHAT_LOG_ID = "space-chat-log";

const readIsLogHidden = (): boolean => {
  try {
    return window.localStorage.getItem(LOG_HIDDEN_STORAGE_KEY) === "1";
  } catch {
    // 사파리 프라이빗 모드 등에서 저장소 접근이 막힘.
    return false;
  }
};

const writeIsLogHidden = (isLogHidden: boolean): void => {
  try {
    window.localStorage.setItem(LOG_HIDDEN_STORAGE_KEY, isLogHidden ? "1" : "0");
  } catch {
    // 기억하지 못해도 지금 화면의 토글은 동작함.
  }
};

interface SpaceChatPanelProps {
  messages: readonly SpaceChatMessage[];
  presence: SpacePresence;
  error: string | null;
  isMessagePending: boolean;
  sendMessage: (body: string) => Promise<boolean>;
  onRetry: () => void;
  /** 손가락 기기는 내역만 띄우고 입력은 키보드 위 막대가 맡음. */
  hasComposer: boolean;
  /** 메시지 글자 크기. 모바일은 12px, 데스크톱은 14px 로 씀. */
  messageTextClassName?: string;
  /** 내역을 펼쳤을 때 높이(px). 숨기면 접속 표시 줄 높이만 남음. */
  height: number;
  /** 너비만 호출부가 정함. 모바일은 좌측 상단, 데스크톱은 좌측 하단에 둠. */
  className?: string;
}

/**
 * 늘 떠 있는 공간 대화창. 맨 위 줄에 접속 표시를 함께 둠.
 *
 * 3D 화면이 비치도록 검은 반투명 배경만 깔고, 글자는 흰색에 그림자를 줘 밝은 배경
 * 위에서도 읽히게 했음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceChatPanel({ messages, presence, error, isMessagePending, sendMessage, onRetry, hasComposer, messageTextClassName = "text-xs", height, className }: SpaceChatPanelProps): ReactNode {
  // region [Hooks]
  const [isLogHidden, setIsLogHidden] = useState(readIsLogHidden);
  /**
   * 숨긴 시점의 마지막 메시지 id. 이후 마지막 id 가 달라지면 새 메시지가 온 것임.
   * `undefined` 는 아직 기준을 못 잡은 상태(숨김으로 들어와 입장 전)임.
   */
  const [hiddenBaselineMessageId, setHiddenBaselineMessageId] = useState<string | null | undefined>(undefined);
  const logRef = useRef<HTMLDivElement>(null);
  const shouldFollowLogRef = useRef(true);
  // endregion


  // region [Privates]
  const followLatestMessages = useCallback((): void => {
    const logElement = logRef.current;
    if (logElement && shouldFollowLogRef.current) {
      logElement.scrollTop = logElement.scrollHeight;
    }
  }, []);

  /**
   * 숨김 상태로 들어왔으면 입장 때 받은 기록까지를 기준으로 잡음.
   *
   * 입장 프레임이 기록과 online 상태를 한 번에 바꾸므로, online 이 된 첫 렌더의 마지막
   * 메시지가 기준임. 안 그러면 들어오자마자 지난 기록 때문에 N 이 뜸.
   */
  const captureInitialHiddenBaseline = useCallback((): void => {
    if (isLogHidden && hiddenBaselineMessageId === undefined && presence.status === "online") {
      setHiddenBaselineMessageId(messages.at(-1)?.id ?? null);
    }
  }, [isLogHidden, hiddenBaselineMessageId, presence.status, messages]);
  // endregion


  // region [Events]
  const onClickToggleLog = useCallback((): void => {
    const nextIsLogHidden = !isLogHidden;
    writeIsLogHidden(nextIsLogHidden);
    // 다시 펼치면 최신 메시지부터 보여줌.
    shouldFollowLogRef.current = true;
    setHiddenBaselineMessageId(nextIsLogHidden ? (messages.at(-1)?.id ?? null) : undefined);
    setIsLogHidden(nextIsLogHidden);
  }, [isLogHidden, messages]);

  const onScrollLog = useCallback((): void => {
    const logElement = logRef.current;
    if (logElement) {
      shouldFollowLogRef.current = logElement.scrollHeight - logElement.scrollTop - logElement.clientHeight < 24;
    }
  }, []);

  const onMouseDownLog = useCallback((event: MouseEvent<HTMLDivElement>): void => {
    event.preventDefault();
  }, []);
  // endregion


  // region [Life Cycles]
  useEffect(followLatestMessages, [messages, isLogHidden, followLatestMessages]);

  useEffect(() => {
    const logElement = logRef.current;
    const listElement = logElement?.querySelector("ol");
    if (!logElement || typeof ResizeObserver === "undefined") {
      return;
    }

    // 오류·재연결 줄이 붙거나 글꼴이 늦게 와서 칸·내용 높이가 바뀌면 다시 바닥에 붙임.
    // 메시지 변경만 보면 기록을 받은 뒤 칸이 줄어든 만큼 위에 멈춰 있었음.
    const resizeObserver = new ResizeObserver(followLatestMessages);
    resizeObserver.observe(logElement);
    if (listElement) {
      resizeObserver.observe(listElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [isLogHidden, followLatestMessages]);
  useEffect(captureInitialHiddenBaseline, [captureInitialHiddenBaseline]);
  // endregion


  // region [Templates]
  const isOnline = presence.status === "online";
  const { label, accessibleLabel, dotClassName, isPulsing } = resolvePresenceDisplay(presence);
  const latestMessageId = messages.at(-1)?.id ?? null;
  const hasUnseenMessages = isLogHidden && hiddenBaselineMessageId !== undefined && latestMessageId !== null && latestMessageId !== hiddenBaselineMessageId;
  const toggleLabel = isLogHidden ? (hasUnseenMessages ? "채팅 내역 보기, 새 메시지 있음" : "채팅 내역 보기") : "채팅 내역 숨기기";
  // endregion

  return (
    <section aria-label="공간 채팅" className={`pointer-events-auto flex flex-col overflow-hidden rounded-xl bg-black/45 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] ${className ?? ""}`} style={isLogHidden ? undefined : { height }}>
      <div className={`flex shrink-0 items-center justify-between gap-2 py-1 pl-2.5 pr-1 ${isLogHidden ? "" : "border-b border-white/10"}`}>
        <div role="status" aria-label={accessibleLabel} className="flex items-center gap-1.5">
          <span className={`size-2 shrink-0 rounded-full ${dotClassName} ${isPulsing ? "animate-pulse" : ""}`} />
          <span aria-hidden="true" className="text-xs font-semibold tabular-nums text-white/90">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          {hasUnseenMessages && (
            <span aria-hidden="true" className="flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold leading-none text-white [text-shadow:none]">N</span>
          )}
          <button type="button" onClick={onClickToggleLog} aria-label={toggleLabel} title={toggleLabel} aria-expanded={!isLogHidden} aria-controls={CHAT_LOG_ID} className="flex size-7 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin">
            {isLogHidden ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        </div>
      </div>

      <div ref={logRef} id={CHAT_LOG_ID} role="log" aria-label="공간 대화" aria-live="polite" aria-relevant="additions" tabIndex={-1} hidden={isLogHidden} onMouseDown={onMouseDownLog} onScroll={onScrollLog} className="min-h-0 flex-1 select-none overflow-y-auto overscroll-contain space-chat-scrollbar py-2 pl-2.5 pr-1.5">
        {messages.length === 0 && <p className={`${messageTextClassName} text-white/60`}>함께 전광판을 보며 이야기해 보세요.</p>}
        <ol className="flex flex-col gap-0.5">
          {messages.map((message) => (
            <li key={message.id} className={`break-words whitespace-pre-wrap leading-snug [overflow-wrap:anywhere] ${messageTextClassName}`}>
              <span className="mr-1 font-semibold text-bitcoin">{message.nickname}</span>
              <span className="text-white">{message.body}</span>
            </li>
          ))}
        </ol>
      </div>

      {error && <p role="status" className="px-2.5 pb-1 text-[11px] leading-snug text-amber-200">{error}</p>}
      {!isOnline && (
        <div className="flex items-center justify-between gap-2 px-2.5 pb-1 text-[11px] text-white/70">
          <span className="flex items-center gap-1"><WifiOff size={11} />연결되면 대화할 수 있어요.</span>
          <button type="button" onClick={onRetry} disabled={presence.status === "connecting"} className="shrink-0 rounded px-1 py-0.5 font-semibold text-bitcoin disabled:opacity-40">재연결</button>
        </div>
      )}

      {hasComposer && (
        <SpaceChatComposer presence={presence} isMessagePending={isMessagePending} sendMessage={sendMessage} className={`px-1.5 pb-1.5 ${isLogHidden ? "pt-0.5" : ""}`} />
      )}
    </section>
  );
}

export default memo(SpaceChatPanel);
