"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SpaceHallBgmState, SpaceHallBgmTrack } from "@/entities/space";
import { loadBgmEnabled, saveBgmEnabled } from "./bgmPreferenceStore";
import {
  SPACE_BGM_COURTYARD_TRACK_SRC,
  SPACE_BGM_COURTYARD_VOLUME,
  SPACE_BGM_PHONK_TRACK_SRC,
  SPACE_BGM_PHONK_VOLUME,
  SPACE_BGM_RAID_TRACK_SRC,
  SPACE_BGM_RAID_VOLUME,
  SPACE_BGM_RUSH_TRACK_SRC,
  SPACE_BGM_RUSH_VOLUME,
  SPACE_BGM_SURGE_TRACK_SRC,
  SPACE_BGM_SURGE_VOLUME,
  SPACE_BGM_TRACK_SRC,
  SPACE_BGM_VOLUME,
} from "./spaceBgmTrack";

/** 내가 선 자리로 정하는 곡. 안뜰에서 보스가 없으면 `courtyard`, 떠 있으면 `raid`. */
export type SpaceBgmZoneTrack = "courtyard" | "raid";

/** 홀 곡은 유저가 고를 수 있는 곡 전부임. */
type BgmTrack = SpaceHallBgmTrack | SpaceBgmZoneTrack;

interface BgmTarget {
  track: BgmTrack;
  /** 서버 시각 기준 곡 시작점. `null` 이면 위치를 안 맞추고 멈춘 자리에서 이음. */
  startsAt: number | null;
}

const TRACK_SRC: Record<BgmTrack, string> = {
  base: SPACE_BGM_TRACK_SRC,
  surge: SPACE_BGM_SURGE_TRACK_SRC,
  rush: SPACE_BGM_RUSH_TRACK_SRC,
  phonk: SPACE_BGM_PHONK_TRACK_SRC,
  courtyard: SPACE_BGM_COURTYARD_TRACK_SRC,
  raid: SPACE_BGM_RAID_TRACK_SRC,
};

const TRACK_VOLUME: Record<BgmTrack, number> = {
  base: SPACE_BGM_VOLUME,
  surge: SPACE_BGM_SURGE_VOLUME,
  rush: SPACE_BGM_RUSH_VOLUME,
  phonk: SPACE_BGM_PHONK_VOLUME,
  courtyard: SPACE_BGM_COURTYARD_VOLUME,
  raid: SPACE_BGM_RAID_VOLUME,
};

export interface SpaceBgm {
  isPlaying: boolean;
  isUnavailable: boolean;
  toggle: () => void;
}

interface SpaceBgmOptions {
  serverClockOffsetMs: number | null;
  /** 누가 골라 둔 홀 곡. 아무도 안 바꿨으면 `null` 이고 기본 곡을 틂. */
  hallBgm: SpaceHallBgmState | null;
  /** 안뜰에 나와 있는 동안 홀 곡 대신 틀 곡. 홀 안이면 `null`. */
  zoneTrack: SpaceBgmZoneTrack | null;
}

/**
 * 아무도 곡을 안 골랐을 때 트는 기본 곡.
 *
 * 시작점을 서버 시각 0 으로 고정해서, 언제 들어오든 다들 곡의 같은 자리를 들음.
 */
const DEFAULT_HALL_TARGET: BgmTarget = { track: "base", startsAt: 0 };

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
 * 음악을 켤지 여부만 개인 설정이다. 홀 곡의 종류·시작 시각·재생 위치는 서버 시각에 맞춘다.
 *
 * 홀 곡의 순서는 누가 골라 둔 곡 → 기본 곡이다. 시세가 크게 움직여도 곡은 안 바뀐다.
 *
 * 안뜰 곡(대기·보스전)만 예외다. 내가 선 자리로 정해서 사람마다 다르고 위치도 안 맞춘다.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
const useSpaceBgm = ({ serverClockOffsetMs, hallBgm, zoneTrack }: SpaceBgmOptions): SpaceBgm => {
  // region [Hooks]
  const tracksRef = useRef<Partial<Record<BgmTrack, HTMLAudioElement>>>({});
  const enabledRef = useRef(false);
  const generationRef = useRef(0);
  const activeTrackRef = useRef<BgmTrack>("base");
  const activeStartRef = useRef<number | null>(null);
  const pendingTrackRef = useRef<string | null>(null);
  const lastAttemptRef = useRef(Number.NEGATIVE_INFINITY);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockOffsetRef = useRef(serverClockOffsetMs);
  const hallBgmRef = useRef(hallBgm);
  const zoneTrackRef = useRef(zoneTrack);
  const blockedPlaybackRef = useRef<(() => void) | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
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
    // 페이드를 끊으면 사라지던 곡이 줄어들다 만 음량으로 계속 돈다. 곡이 둘일 때는 그 곡이 곧
    // 다음 전환의 대상이라 정리됐지만, 셋 이상이면 남아서 겹쳐 들린다. 이번 전환과 무관한 곡은 멈춘다.
    for (const other of Object.values(tracksRef.current)) {
      if (other !== audio && other !== previous) {
        other.pause();
      }
    }
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
    if (zoneTrackRef.current) {
      return { track: zoneTrackRef.current, startsAt: null };
    }
    const hall = hallBgmRef.current;
    const offset = clockOffsetRef.current;
    const serverNow = offset === null ? null : performance.now() + offset;
    if (hall && serverNow !== null && serverNow >= hall.startsAt) {
      return { track: hall.track, startsAt: hall.startsAt };
    }
    if (serverNow !== null) {
      return DEFAULT_HALL_TARGET;
    }
    // 안뜰에서 나왔는데 서버 시각을 아직 모르면 안뜰 곡이 계속 남는다. 기본 곡으로 돌린다.
    const isZoneTrackActive = activeTrackRef.current === "raid" || activeTrackRef.current === "courtyard";
    return isZoneTrackActive ? { track: "base", startsAt: null } : null;
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
    clockOffsetRef.current = serverClockOffsetMs;
    hallBgmRef.current = hallBgm;
    zoneTrackRef.current = zoneTrack;
    // 이번에 기다릴 곡. 안뜰 곡 → 고른 곡 → 기본 곡 순서임.
    const upcoming: BgmTarget = zoneTrack ? { track: zoneTrack, startsAt: null } : (hallBgm ?? DEFAULT_HALL_TARGET);
    if (enabledRef.current && hallBgm) {
      resolveTrack(hallBgm.track);
    }
    // 새 서버 이벤트는 과거 실패의 재시도 대기와 별도로 예정 시각에 실행한다.
    const begin = (): void => {
      const pending = pendingTrackRef.current;
      const awaited = `${upcoming.track}:${upcoming.startsAt}`;
      if (pending && pending !== awaited) {
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
    // 안뜰 곡은 서버 예정 시각을 안 기다린다. 안뜰을 드나들거나 보스가 뜨면 즉시 바꾼다.
    const delay = upcoming.startsAt !== null && serverClockOffsetMs !== null ? Math.max(0, upcoming.startsAt - serverClockOffsetMs - performance.now()) : 0;
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
  useEffect(() => scheduleSynchronization(), [serverClockOffsetMs, hallBgm, zoneTrack, isPlaying, resolveTrack, synchronizePlayback]);
  // endregion

  // 값이 그대로면 같은 객체를 돌려줌. 매번 새로 만들면 이걸 받는 HUD 가 `memo` 를 뚫고 다시 그려짐.
  return useMemo(
    () => ({ isPlaying, isUnavailable, toggle: onClickToggleBgm }),
    [isPlaying, isUnavailable, onClickToggleBgm],
  );
};

export default useSpaceBgm;
