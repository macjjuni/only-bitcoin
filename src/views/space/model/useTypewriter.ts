"use client";

import { useCallback, useEffect, useState } from "react";

/** 한 글자를 찍는 간격(ms). */
const CHARACTER_INTERVAL_MS = 28;

export interface Typewriter {
  /** 지금까지 찍힌 글. */
  shownText: string;
  isDone: boolean;
  /** 남은 글을 한 번에 다 찍음. 기다리기 싫은 사람이 눌러 넘김. */
  finish: () => void;
}

/**
 * 글을 한 글자씩 찍어 보여 줌. 게임 대화상자의 대사에 씀.
 *
 * 글이 바뀌면 처음부터 다시 찍음. 움직임을 줄이라고 설정한 사람에게는 처음부터 다 보여 줌.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export const useTypewriter = (text: string): Typewriter => {
  // region [Hooks]
  /**
   * 어느 글을 몇 글자까지 찍었는지. 글과 같이 들고 있음.
   *
   * 글자 수만 들면 글이 바뀐 첫 렌더에 앞 글의 글자 수가 남아, 새 글이 통째로 한 번
   * 번쩍였다가 처음부터 다시 찍혔음.
   */
  const [progress, setProgress] = useState<{ text: string; length: number }>({ text, length: 0 });
  const shownLength = progress.text === text ? progress.length : 0;
  // endregion


  // region [Privates]
  /** 한글 한 글자가 쪼개지지 않게 코드 포인트 단위로 셈. */
  const characters = Array.from(text);

  const startTyping = useCallback((): (() => void) | undefined => {
    const characterCount = Array.from(text).length;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress({ text, length: characterCount });
      return;
    }

    setProgress({ text, length: 0 });
    const intervalID = window.setInterval(() => {
      setProgress((previous) => {
        if (previous.text !== text || previous.length >= characterCount) {
          window.clearInterval(intervalID);
          return previous;
        }

        return { text, length: previous.length + 1 };
      });
    }, CHARACTER_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalID);
    };
  }, [text]);
  // endregion


  // region [Events]
  const finish = useCallback((): void => {
    setProgress({ text, length: Array.from(text).length });
  }, [text]);
  // endregion


  // region [Life Cycles]
  useEffect(startTyping, [startTyping]);
  // endregion

  return {
    shownText: characters.slice(0, shownLength).join(""),
    isDone: shownLength >= characters.length,
    finish,
  };
};
