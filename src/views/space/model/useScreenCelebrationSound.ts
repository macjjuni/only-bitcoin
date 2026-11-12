"use client";

import { useEffect, useRef } from "react";
import type { SpaceCelebration } from "@/entities/space";
import { createCelebrationSoundPlayer } from "../lib/celebrationSoundPlayer";
import {
  type CelebrationSoundSequence,
  createCelebrationSoundSequence,
} from "../lib/celebrationSoundSequence";

/** 서버 이벤트 하나당 효과음 3회. 소리 설정·탭 상태와 상관없이 폭죽 시계는 계속 간다. */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export const useScreenCelebrationSound = (
  celebration: SpaceCelebration | null,
  clockOffsetMs: number | null,
  isEnabled: boolean,
): void => {
  // region [Hooks]
  const sequenceRef = useRef<CelebrationSoundSequence | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPrimingRef = useRef(false);
  // endregion


  // region [Privates]
  const prepareSound = (): (() => void) => {
    const audio = new Audio("/audio/winneris.mp3");
    audio.volume = 0.3;
    audio.loop = false;
    audio.preload = "auto";
    audioRef.current = audio;
    const player = createCelebrationSoundPlayer(audio);
    const sequence = createCelebrationSoundSequence(player, () => !document.hidden);
    sequenceRef.current = sequence;

    const detachUnlock = (): void => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
    const onFirstGesture = (): void => {
      detachUnlock();
      if (!audio.paused) {
        return;
      }
      // 자동 재생을 제한하는 브라우저를 위해 첫 조작에서 음원을 준비한다.
      isPrimingRef.current = true;
      audio.muted = true;
      audio.volume = 0;
      void audio.play().then(() => {
        if (isPrimingRef.current) {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
          audio.volume = 0.3;
          isPrimingRef.current = false;
        }
      }).catch(() => {});
    };
    const onChangeVisibility = (): void => {
      if (document.hidden) {
        isPrimingRef.current = false;
        player.stop();
        audio.muted = false;
        audio.volume = 0.3;
      }
    };
    window.addEventListener("pointerdown", onFirstGesture);
    window.addEventListener("keydown", onFirstGesture);
    document.addEventListener("visibilitychange", onChangeVisibility);
    return () => {
      detachUnlock();
      document.removeEventListener("visibilitychange", onChangeVisibility);
      sequenceRef.current = null;
      audioRef.current = null;
      isPrimingRef.current = false;
      sequence.stop();
      audio.removeAttribute("src");
      audio.load();
    };
  };

  const synchronizeSound = (): void => {
    if (!isEnabled || !celebration || clockOffsetMs === null) {
      sequenceRef.current?.stop();
      return;
    }
    if (audioRef.current) {
      if (isPrimingRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      audioRef.current.muted = false;
      audioRef.current.volume = 0.3;
    }
    isPrimingRef.current = false;
    sequenceRef.current?.schedule(celebration.id, celebration.startsAt - clockOffsetMs);
  };
  // endregion


  // region [Life Cycles]
  useEffect(() => prepareSound(), []);
  useEffect(() => synchronizeSound(), [celebration, clockOffsetMs, isEnabled]);
  // endregion
};
