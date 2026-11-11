"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpaceMarketState } from "@/entities/space";
import { loadBgmEnabled, saveBgmEnabled } from "./bgmPreferenceStore";
import {
  SPACE_BGM_SURGE_TRACK_SRC,
  SPACE_BGM_SURGE_VOLUME,
  SPACE_BGM_TRACK_SRC,
  SPACE_BGM_VOLUME,
} from "./spaceBgmTrack";

export interface SpaceBgm {
  isPlaying: boolean;
  isUnavailable: boolean;
  isSurging: boolean;
  toggle: () => void;
}

interface SpaceBgmOptions {
  market: SpaceMarketState | null;
  serverClockOffsetMs: number | null;
}

/** 음악을 켤지 여부만 개인 설정이다. 트랙 종류·시작 시각·재생 위치는 서버가 정한다. */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
const useSpaceBgm = ({ market, serverClockOffsetMs }: SpaceBgmOptions): SpaceBgm => {
  // region [Hooks]
  const tracksRef = useRef<Partial<Record<"base" | "surge", HTMLAudioElement>>>({});
  const enabledRef = useRef(false);
  const generationRef = useRef(0);
  const activeTrackRef = useRef<"base" | "surge">("base");
  const activeStartRef = useRef<number | null>(null);
  const pendingTrackRef = useRef<string | null>(null);
  const lastAttemptRef = useRef(Number.NEGATIVE_INFINITY);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const marketRef = useRef(market);
  const clockOffsetRef = useRef(serverClockOffsetMs);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isSurging, setIsSurging] = useState(false);
  // endregion


  // region [Privates]
  const resolveTrack = useCallback((track: "base" | "surge"): HTMLAudioElement => {
    const existing = tracksRef.current[track];
    if (existing) {
      return existing;
    }
    const audio = new Audio(track === "surge" ? SPACE_BGM_SURGE_TRACK_SRC : SPACE_BGM_TRACK_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    tracksRef.current[track] = audio;
    return audio;
  }, []);

  const clearFade = useCallback((): void => {
    if (fadeTimerRef.current !== null) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const alignPosition = useCallback((audio: HTMLAudioElement, startsAt: number | null): void => {
    const offset = clockOffsetRef.current;
    if (startsAt === null || offset === null || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }
    const position = Math.max(0, (performance.now() + offset - startsAt) / 1000) % audio.duration;
    const distance = Math.abs(audio.currentTime - position);
    if (Math.min(distance, audio.duration - distance) > 0.3) {
      audio.currentTime = position;
    }
  }, []);

  const playTrack = useCallback(async (track: "base" | "surge", startsAt: number | null): Promise<boolean> => {
    const generation = ++generationRef.current;
    const audio = resolveTrack(track);
    const previous = tracksRef.current[activeTrackRef.current];
    const volume = track === "surge" ? SPACE_BGM_SURGE_VOLUME : SPACE_BGM_VOLUME;
    pendingTrackRef.current = `${track}:${startsAt}`;
    lastAttemptRef.current = performance.now();
    clearFade();
    // 전환이 중간에 취소됐어도 현재 곡의 음량을 복원해 무음으로 남기지 않는다.
    if (previous && previous !== audio) {
      previous.volume = activeTrackRef.current === "surge" ? SPACE_BGM_SURGE_VOLUME : SPACE_BGM_VOLUME;
      audio.volume = 0;
    } else {
      audio.volume = volume;
    }
    alignPosition(audio, startsAt);
    try {
      await audio.play();
      if (generation !== generationRef.current || !enabledRef.current) {
        return false;
      }
      alignPosition(audio, startsAt);
      activeTrackRef.current = track;
      activeStartRef.current = startsAt;
      setIsPlaying(true);
      setIsUnavailable(false);
      setIsSurging(track === "surge");
      if (previous && previous !== audio && !previous.paused) {
        const beganAt = performance.now();
        const previousVolume = previous.volume;
        fadeTimerRef.current = setInterval(() => {
          const progress = Math.min(1, (performance.now() - beganAt) / 1500);
          audio.volume = volume * progress;
          previous.volume = previousVolume * (1 - progress);
          if (progress === 1) {
            previous.pause();
            clearFade();
          }
        }, 50);
      } else {
        audio.volume = volume;
      }
      return true;
    } catch (error) {
      if (generation !== generationRef.current) {
        return false;
      }
      if (!previous || previous.paused) {
        setIsPlaying(false);
        setIsSurging(false);
        setIsUnavailable((error as DOMException).name !== "NotAllowedError" && track === "base");
      }
      return false;
    } finally {
      if (generation === generationRef.current) {
        pendingTrackRef.current = null;
      }
    }
  }, [alignPosition, clearFade, resolveTrack]);

  const startPlayback = useCallback(async (): Promise<boolean> => {
    enabledRef.current = true;
    const state = marketRef.current;
    const offset = clockOffsetRef.current;
    const hasStarted = state && offset !== null && performance.now() + offset >= state.startsAt;
    return playTrack(hasStarted ? state.track : activeTrackRef.current, hasStarted ? state.startsAt : activeStartRef.current);
  }, [playTrack]);

  const stopPlayback = useCallback((): void => {
    enabledRef.current = false;
    generationRef.current += 1;
    pendingTrackRef.current = null;
    clearFade();
    for (const audio of Object.values(tracksRef.current)) {
      audio.pause();
    }
    setIsPlaying(false);
    setIsSurging(false);
  }, [clearFade]);

  const synchronizePlayback = useCallback((): void => {
    const state = marketRef.current;
    const offset = clockOffsetRef.current;
    if (!enabledRef.current || !state || offset === null || performance.now() + offset < state.startsAt) {
      return;
    }
    if (pendingTrackRef.current) {
      return;
    }
    if (activeTrackRef.current !== state.track || activeStartRef.current !== state.startsAt) {
      if (performance.now() - lastAttemptRef.current >= 5000) {
        void playTrack(state.track, state.startsAt);
      }
      return;
    }
    const audio = tracksRef.current[state.track];
    if (audio && !audio.paused) {
      alignPosition(audio, state.startsAt);
    }
  }, [alignPosition, playTrack]);

  const restorePlayback = useCallback((): (() => void) => {
    let disposed = false;
    const onFirstGesture = (event: Event): void => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
      // 음악 버튼 자체를 누른 경우에는 그 버튼이 한 번만 토글하도록 맡긴다.
      if (event.target instanceof Element && event.target.closest('button[aria-label^="배경음악"]')) {
        return;
      }
      if (loadBgmEnabled()) {
        void startPlayback();
      }
    };
    if (loadBgmEnabled()) {
      void startPlayback().then((started) => {
        if (!started && !disposed && loadBgmEnabled()) {
          enabledRef.current = false;
          window.addEventListener("pointerdown", onFirstGesture);
          window.addEventListener("keydown", onFirstGesture);
        }
      });
    }
    return () => {
      disposed = true;
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
      stopPlayback();
      for (const audio of Object.values(tracksRef.current)) {
        audio.removeAttribute("src");
        audio.load();
      }
      tracksRef.current = {};
    };
  }, [startPlayback, stopPlayback]);

  const scheduleSynchronization = (): (() => void) => {
    marketRef.current = market;
    clockOffsetRef.current = serverClockOffsetMs;
    if (enabledRef.current && (market?.prefetch || market?.track === "surge")) {
      resolveTrack("surge");
    }
    // 새 서버 이벤트는 과거 실패의 재시도 대기와 별도로 예정 시각에 실행한다.
    const begin = (): void => {
      const pending = pendingTrackRef.current;
      if (market && pending && pending !== `${market.track}:${market.startsAt}`) {
        generationRef.current += 1;
        pendingTrackRef.current = null;
        for (const [track, audio] of Object.entries(tracksRef.current)) {
          if (track !== activeTrackRef.current || !isPlaying) {
            audio.pause();
          }
        }
      }
      lastAttemptRef.current = Number.NEGATIVE_INFINITY;
      synchronizePlayback();
    };
    const delay = market && serverClockOffsetMs !== null ? Math.max(0, market.startsAt - serverClockOffsetMs - performance.now()) : 0;
    const timer = setTimeout(begin, delay);
    const retryTimer = setInterval(synchronizePlayback, 5000);
    const onVisibility = (): void => {
      if (!document.hidden) {
        synchronizePlayback();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timer);
      clearInterval(retryTimer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  };
  // endregion


  // region [Events]
  const onClickToggleBgm = useCallback((): void => {
    if (enabledRef.current) {
      saveBgmEnabled(false);
      stopPlayback();
    } else {
      saveBgmEnabled(true);
      void startPlayback();
    }
  }, [startPlayback, stopPlayback]);
  // endregion


  // region [Life Cycles]
  useEffect(restorePlayback, [restorePlayback]);
  useEffect(() => scheduleSynchronization(), [market, serverClockOffsetMs, isPlaying, resolveTrack, synchronizePlayback]);
  // endregion

  return { isPlaying, isUnavailable, isSurging, toggle: onClickToggleBgm };
};

export default useSpaceBgm;
