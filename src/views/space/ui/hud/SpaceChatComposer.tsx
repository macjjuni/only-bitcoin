"use client";

import { Send } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  memo,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  SPACE_CHAT_COOLDOWN_MS,
  SPACE_CHAT_MAX_GRAPHEMES,
  type SpacePresence,
} from "@/entities/space";
import { countGraphemes } from "@/shared/lib/text/countGraphemes";

/** 패널 밖에서 입력칸으로 포커스를 옮길 때 쓴다. */
export const SPACE_CHAT_INPUT_ID = "space-chat-input";

/** 글자 수는 한도에 가까워질 때만 보여줌. */
const CHARACTER_COUNT_VISIBLE_FROM = SPACE_CHAT_MAX_GRAPHEMES - 20;

interface SpaceChatComposerProps {
  presence: SpacePresence;
  isMessagePending: boolean;
  sendMessage: (body: string) => Promise<boolean>;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
}

/**
 * 공간 대화 입력칸.
 *
 * 데스크톱은 대화창 안에, 손가락 기기는 키보드 위 막대에 넣어 씀. 입력 글자는 16px
 * 그대로 둠. 그보다 작으면 iOS 가 포커스 때 화면을 확대함.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceChatComposer({ presence, isMessagePending, sendMessage, onFocus, onBlur, className }: SpaceChatComposerProps): ReactNode {
  // region [Hooks]
  const [draft, setDraft] = useState("");
  const [cooldownEndsAt, setCooldownEndsAt] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);
  const isMountedRef = useRef(false);
  // endregion


  // region [Privates]
  const trackMountedComposer = useCallback((): (() => void) => {
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

  /**
   * Esc 와 빈 입력칸의 Enter 는 입력만 끝냄.
   *
   * 데스크톱은 Enter 로 입력칸에 들어오므로, 아무것도 안 쓰고 한 번 더 누르면 다시
   * 이동 조작으로 돌아가게 함. 한글 조합 중 Enter 는 조합 확정이라 건드리지 않음.
   */
  const onKeyDownInput = useCallback((event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Escape") {
      inputRef.current?.blur();
      return;
    }
    if (event.key !== "Enter") {
      return;
    }
    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      event.preventDefault();
      return;
    }
    if (draft.trim().length === 0) {
      event.preventDefault();
      inputRef.current?.blur();
    }
  }, [draft]);

  /** 보내기를 눌러도 입력칸 포커스를 지킴. 모바일에선 포커스가 빠지면 키보드와 입력 막대가 같이 내려감. */
  const onPointerDownSend = useCallback((event: PointerEvent<HTMLButtonElement>): void => {
    event.preventDefault();
  }, []);

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
    }
  }, [draft, presence.status, isMessagePending, cooldownEndsAt, sendMessage]);
  // endregion


  // region [Life Cycles]
  useEffect(trackMountedComposer, [trackMountedComposer]);
  useEffect(startCooldownCountdown, [startCooldownCountdown]);
  // endregion


  // region [Templates]
  const characterCount = countGraphemes(draft);
  const canSend = presence.status === "online" && !isMessagePending && remainingSeconds === 0 && characterCount > 0 && characterCount <= SPACE_CHAT_MAX_GRAPHEMES;
  const sendLabel = isMessagePending ? "전송 중" : remainingSeconds > 0 ? `${remainingSeconds}초` : "보내기";
  const isOverCharacterLimit = characterCount > SPACE_CHAT_MAX_GRAPHEMES;
  // endregion

  return (
    <form onSubmit={onSubmitMessage} className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <div className="flex min-w-0 flex-1 items-center rounded-full bg-white/10 pl-3 pr-2 focus-within:bg-white/15 focus-within:ring-1 focus-within:ring-bitcoin/50">
        <input ref={inputRef} id={SPACE_CHAT_INPUT_ID} aria-label="공간 메시지" value={draft} onChange={onChangeDraft} onKeyDown={onKeyDownInput} onFocus={onFocus} onBlur={onBlur} maxLength={8192} autoComplete="off" enterKeyHint="send" placeholder="메시지 입력" className="h-8 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/40" />
        {characterCount > CHARACTER_COUNT_VISIBLE_FROM && (
          <span className={`ml-2 shrink-0 text-[10px] tabular-nums ${isOverCharacterLimit ? "text-amber-200" : "text-white/50"}`}>
            {characterCount}/{SPACE_CHAT_MAX_GRAPHEMES}
          </span>
        )}
      </div>
      <button type="submit" aria-label={sendLabel} title={sendLabel} disabled={!canSend} onPointerDown={onPointerDownSend} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bitcoin text-[10px] font-bold text-black [text-shadow:none] transition-opacity disabled:opacity-30">
        {remainingSeconds > 0 ? sendLabel : <Send size={13} />}
      </button>
    </form>
  );
}

export default memo(SpaceChatComposer);
