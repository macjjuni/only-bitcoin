"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpaceMarketState } from "@/entities/space";
import { loadBgmEnabled, saveBgmEnabled } from "./bgmPreferenceStore";
import {
  SPACE_BGM_RAID_TRACK_SRC,
  SPACE_BGM_RAID_VOLUME,
  SPACE_BGM_SURGE_TRACK_SRC,
  SPACE_BGM_SURGE_VOLUME,
  SPACE_BGM_TRACK_SRC,
  SPACE_BGM_VOLUME,
} from "./spaceBgmTrack";

type BgmTrack = "base" | "surge" | "raid";

interface BgmTarget {
  track: BgmTrack;
  /** 서버 시각 기준 곡 시작점. `null` 이면 위치를 안 맞추고 멈춘 자리에서 이음. */
  startsAt: number | null;
}

const TRACK_SRC: Record<BgmTrack, string> = {
  base: SPACE_BGM_TRACK_SRC,
  surge: SPACE_BGM_SURGE_TRACK_SRC,
  raid: SPACE_BGM_RAID_TRACK_SRC,
};

const TRACK_VOLUME: Record<BgmTrack, number> = {
  base: SPACE_BGM_VOLUME,
  surge: SPACE_BGM_SURGE_VOLUME,
  raid: SPACE_BGM_RAID_VOLUME,
};

export interface SpaceBgm {
  isPlaying: boolean;
  isUnavailable: boolean;
  isSurging: boolean;
  toggle: () => void;
}

interface SpaceBgmOptions {
  market: SpaceMarketState | null;
  serverClockOffsetMs: number | null;
  /** 레이드 구역(안뜰)에 나와 있는지. 나와 있는 동안은 시세 트랙 대신 레이드 곡을 튼다. */
  isInRaid: boolean;
}

/** 곡을 새로 틀 때 서버 위치와 맞추는 허용 오차(초). */
const START_TOLERANCE_SECONDS = 0.3;

/**
 * 재생 중 주기 점검의 허용 오차(초).
 *
 * 모바일은 탐색 한 번에 0.3 초 넘게 멈춘다. 시작 때와 같은 오차를 쓰면 탐색으로
 * 밀린 만큼을 다음 점검이 또 탐색으로 고치려 들어 5 초마다 소리가 끊긴다.
 */
const RESYNC_TOLERANCE_SECONDS = 2;

/**
 * 음악을 켤지 여부만 개인 설정이다. 트랙 종류·시작 시각·재생 위치는 서버가 정한다.
 *
 * 레이드 곡만 예외다. 내가 안뜰에 있는지로 정해서 사람마다 다르고 위치도 안 맞춘다.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
const useSpaceBgm = ({ market, serverClockOffsetMs, isInRaid }: SpaceBgmOptions): SpaceBgm => {
  // region [Hooks]
  const tracksRef = useRef<Partial<Record<BgmTrack, HTMLAudioElement>>>({});
  const enabledRef = useRef(false);
  const generationRef = useRef(0);
  const activeTrackRef = useRef<BgmTrack>("base");
  const activeStartRef = useRef<number | null>(null);
  const pendingTrackRef = useRef<string | null>(null);
  const lastAttemptRef = useRef(Number.NEGATIVE_INFINITY);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const marketRef = useRef(market);
  const clockOffsetRef = useRef(serverClockOffsetMs);
  const inRaidRef = useRef(isInRaid);
  const blockedPlaybackRef = useRef<(() => void) | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isSurging, setIsSurging] = useState(false);
  // endregion


  // region [Privates]
  const resolveTrack = useCallback((track: BgmTrack): HTMLAudioElement => {
    const existing = tracksRef.current[track];
    if (existing) {
      return existing;
    }
    const audio = new Audio(TRACK_SRC[track]);
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

  const alignPosition = useCallback((audio: HTMLAudioElement, startsAt: number | null, toleranceSeconds: number): void => {
    const offset = clockOffsetRef.current;
    // 앞선 탐색이 끝나기 전에 또 옮기면 버퍼링만 길어진다.
    if (audio.seeking || startsAt === null || offset === null || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }
    const position = Math.max(0, (performance.now() + offset - startsAt) / 1000) % audio.duration;
    const distance = Math.abs(audio.currentTime - position);
    if (Math.min(distance, audio.duration - distance) > toleranceSeconds) {
      audio.currentTime = position;
    }
  }, []);

  const playTrack = useCallback(async (track: BgmTrack, startsAt: number | null): Promise<boolean> => {
    const generation = ++generationRef.current;
    const audio = resolveTrack(track);
    const previous = tracksRef.current[activeTrackRef.current];
    const volume = TRACK_VOLUME[track];
    pendingTrackRef.current = `${track}:${startsAt}`;
    lastAttemptRef.current = performance.now();
    clearFade();
    // 전환이 중간에 취소됐어도 현재 곡의 음량을 복원해 무음으로 남기지 않는다.
    if (previous && previous !== audio) {
      previous.volume = TRACK_VOLUME[activeTrackRef.current];
      audio.volume = 0;
    } else {
      audio.volume = volume;
    }
    alignPosition(audio, startsAt, START_TOLERANCE_SECONDS);
    try {
      await audio.play();
      if (generation !== generationRef.current) {
        return false;
      }
      if (!enabledRef.current) {
        audio.pause();
        return false;
      }
      alignPosition(audio, startsAt, START_TOLERANCE_SECONDS);
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
        // 새 시도로 교체된 취소는 위에서 걸러졌다. 실제로 막힌 재생만 첫 조작을 기다린다.
        blockedPlaybackRef.current?.();
      }
      return false;
    } finally {
      if (generation === generationRef.current) {
        pendingTrackRef.current = null;
      }
    }
  }, [alignPosition, clearFade, resolveTrack]);

  /** 지금 틀어야 할 곡. 아직 정할 수 없으면 `null`. */
  const resolveTarget = useCallback((): BgmTarget | null => {
    if (inRaidRef.current) {
      return { track: "raid", startsAt: null };
    }
    const state = marketRef.current;
    const offset = clockOffsetRef.current;
    if (state && offset !== null && performance.now() + offset >= state.startsAt) {
      return { track: state.track, startsAt: state.startsAt };
    }
    // 안뜰에서 나왔는데 시세 상태를 아직 모르면 레이드 곡이 계속 남는다. 기본 곡으로 돌린다.
    return activeTrackRef.current === "raid" ? { track: "base", startsAt: null } : null;
  }, []);

  const startPlayback = useCallback(async (): Promise<boolean> => {
    enabledRef.current = true;
    const target = resolveTarget();
    return playTrack(target ? target.track : activeTrackRef.current, target ? target.startsAt : activeStartRef.current);
  }, [playTrack, resolveTarget]);

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
    const target = enabledRef.current ? resolveTarget() : null;
    if (!target) {
      return;
    }
    if (pendingTrackRef.current) {
      return;
    }
    if (activeTrackRef.current !== target.track || activeStartRef.current !== target.startsAt) {
      if (performance.now() - lastAttemptRef.current >= 5000) {
        void playTrack(target.track, target.startsAt);
      }
      return;
    }
    const audio = tracksRef.current[target.track];
    if (!audio) {
      return;
    }
    if (!audio.paused) {
      alignPosition(audio, target.startsAt, RESYNC_TOLERANCE_SECONDS);
      return;
    }
    // 모바일은 앱 전환·전화·잠금으로 OS 가 재생을 멈춘다. 화면에 돌아오면 다시 잇는다.
    if (!document.hidden && performance.now() - lastAttemptRef.current >= 5000) {
      void playTrack(target.track, target.startsAt);
    }
  }, [alignPosition, playTrack, resolveTarget]);

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
    blockedPlaybackRef.current = (): void => {
      if (!disposed && loadBgmEnabled()) {
        enabledRef.current = false;
        window.addEventListener("pointerdown", onFirstGesture);
        window.addEventListener("keydown", onFirstGesture);
      }
    };
    if (loadBgmEnabled()) {
      void startPlayback();
    }
    return () => {
      disposed = true;
      blockedPlaybackRef.current = null;
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
    inRaidRef.current = isInRaid;
    if (enabledRef.current && (market?.prefetch || market?.track === "surge")) {
      resolveTrack("surge");
    }
    // 새 서버 이벤트는 과거 실패의 재시도 대기와 별도로 예정 시각에 실행한다.
    const begin = (): void => {
      const pending = pendingTrackRef.current;
      const awaited = isInRaid ? "raid:null" : market && `${market.track}:${market.startsAt}`;
      if (awaited && pending && pending !== awaited) {
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
    // 레이드 곡은 서버 예정 시각을 안 기다린다. 안뜰을 드나든 즉시 바꾼다.
    const delay = !isInRaid && market && serverClockOffsetMs !== null ? Math.max(0, market.startsAt - serverClockOffsetMs - performance.now()) : 0;
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
  useEffect(() => scheduleSynchronization(), [market, serverClockOffsetMs, isInRaid, isPlaying, resolveTrack, synchronizePlayback]);
  // endregion

  return { isPlaying, isUnavailable, isSurging, toggle: onClickToggleBgm };
};

export default useSpaceBgm;
