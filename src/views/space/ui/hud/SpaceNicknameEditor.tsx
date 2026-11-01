"use client";

import { X } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CHAT_MAX_NICKNAME_GRAPHEMES } from "@/shared/config/chat";
import { countGraphemes } from "@/shared/lib/text/countGraphemes";

interface SpaceNicknameEditorProps {
  nickname: string;
  error: string | null;
  isNicknamePending: boolean;
  changeNickname: (nickname: string) => Promise<boolean>;
  onClose: () => void;
}

// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceNicknameEditor({ nickname, error, isNicknamePending, changeNickname, onClose }: SpaceNicknameEditorProps): ReactNode {
  // region [Hooks]
  const [nicknameDraft, setNicknameDraft] = useState(nickname);
  const nicknameInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(false);
  // endregion


  // region [Privates]
  const focusNicknameInput = useCallback((): void => {
    nicknameInputRef.current?.focus();
  }, []);

  const trackMountedEditor = useCallback((): (() => void) => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  // endregion


  // region [Transactions]
  const saveNickname = useCallback(async (): Promise<void> => {
    const submittedNickname = nicknameDraft.trim();
    if (!submittedNickname || countGraphemes(submittedNickname) > CHAT_MAX_NICKNAME_GRAPHEMES || isNicknamePending) {
      return;
    }

    const wasAccepted = await changeNickname(submittedNickname);
    if (isMountedRef.current && wasAccepted) {
      onClose();
    }
  }, [nicknameDraft, isNicknamePending, changeNickname, onClose]);
  // endregion


  // region [Events]
  const onClickCloseEditor = useCallback((): void => {
    onClose();
  }, [onClose]);

  const onChangeNicknameDraft = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setNicknameDraft(event.target.value);
  }, []);

  const onKeyDownNicknameEditor = useCallback((event: KeyboardEvent<HTMLFormElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }

    // 한글 조합 중 Enter는 저장 대신 글자 확정에만 사용한다.
    if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) {
      event.preventDefault();
    }
  }, [onClose]);

  const onSubmitNickname = useCallback(async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await saveNickname();
  }, [saveNickname]);
  // endregion


  // region [Life Cycles]
  useEffect(trackMountedEditor, [trackMountedEditor]);
  useEffect(focusNicknameInput, [focusNicknameInput]);
  // endregion


  // region [Templates]
  const nicknameCount = countGraphemes(nicknameDraft);
  const isNicknameTooLong = nicknameCount > CHAT_MAX_NICKNAME_GRAPHEMES;
  const canSaveNickname = !isNicknamePending && nicknameDraft.trim().length > 0 && !isNicknameTooLong;
  const nicknameCountClassName = isNicknameTooLong ? "text-amber-200" : "text-white/45";
  const saveLabel = isNicknamePending ? "저장 중" : "저장";
  // endregion

  return (
    <form aria-label="닉네임 변경" onSubmit={onSubmitNickname} onKeyDown={onKeyDownNicknameEditor} className="pointer-events-auto w-64 max-w-[calc(100vw-5rem)] rounded-xl border border-white/15 bg-[#10151f]/95 p-3 text-white shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">닉네임 변경</h2>
        <button type="button" onClick={onClickCloseEditor} aria-label="닉네임 변경 닫기" className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <label htmlFor="space-nickname-input" className="mb-1 block text-xs text-white/70">닉네임</label>
      <input ref={nicknameInputRef} id="space-nickname-input" value={nicknameDraft} onChange={onChangeNicknameDraft} disabled={isNicknamePending} maxLength={64} autoComplete="off" aria-describedby="space-nickname-count" aria-invalid={isNicknameTooLong} className="h-9 w-full rounded-lg border border-white/15 bg-black/30 px-2.5 text-base text-white outline-none focus:border-bitcoin/60 disabled:opacity-50" />
      <p id="space-nickname-count" className={`mt-1 text-right text-xs ${nicknameCountClassName}`}>{nicknameCount}/{CHAT_MAX_NICKNAME_GRAPHEMES}</p>

      {error && <p role="status" className="mt-2 text-xs leading-relaxed text-amber-200">{error}</p>}

      <button type="submit" disabled={!canSaveNickname} className="mt-3 h-9 w-full rounded-lg bg-bitcoin px-3 text-xs font-bold text-black disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin focus-visible:outline-offset-2">
        {saveLabel}
      </button>
    </form>
  );
}

export default memo(SpaceNicknameEditor);
