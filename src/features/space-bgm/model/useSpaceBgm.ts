"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type BtcCandle, useBitcoinStore } from "@/entities/bitcoin";
import { useBtcCandlesQuery } from "@/entities/bitcoin/client";
import { isDev } from "@/shared/utils/common";
import { loadBgmEnabled, saveBgmEnabled } from "./bgmPreferenceStore";
import {
  appendPriceSample,
  createSurgeState,
  readCandleChangePercent,
  resolveReferencePrice,
  SPACE_BGM_SURGE,
  type SurgeState,
  stepSurgeState,
} from "./priceSurge";
import {
  SPACE_BGM_SURGE_TRACK_SRC,
  SPACE_BGM_SURGE_VOLUME,
  SPACE_BGM_TRACK_SRC,
  SPACE_BGM_VOLUME,
} from "./spaceBgmTrack";

export interface SpaceBgm {
  isPlaying: boolean;
  /**
   * 음원을 재생할 수 없는 상태. 파일이 없거나 브라우저가 코덱을 못 읽는 경우다.
   * 이때는 눌러도 아무 일이 없으므로 HUD 버튼 자체를 내린다.
   */
  isUnavailable: boolean;
  /** 급등락 트랙이 깔려 있는 중. HUD 아이콘을 바꾸는 데 쓴다. */
  isSurging: boolean;
  toggle: () => void;
}

/** 첫 조작을 기다릴 때 들을 이벤트. 공간에 들어오면 곧 누르거나 키를 치게 된다. */
const GESTURE_EVENT_NAMES = ["pointerdown", "keydown"] as const;

/** 트랙을 바꿀 때 겹치는 시간. 하드컷은 끊긴 느낌이 크다. */
const CROSSFADE_MS = 1500;
const CROSSFADE_STEP_MS = 50;

/**
 * 켜자마자 급등락 중이어도 이만큼은 기본 트랙을 깐다.
 *
 * 바로 교체 트랙으로 시작하면 그 사람은 기본 트랙을 들어본 적이 없어 "바뀐 것"
 * 으로 인지하지 못한다. 그냥 평소 배경음이 이상한 곡인 줄 안다. 이 기능의 값어치는
 * 전환이 체감되는 데 있지 어떤 곡이 깔리느냐에 있지 않다.
 */
const SURGE_START_GRACE_MS = 8 * 1000;

/** 상태기계를 돌리는 주기. 시세가 멈춰도 해제·쿨다운이 흘러가야 한다. */
const SURGE_TICK_MS = 5 * 1000;

const EMPTY_CANDLES: readonly BtcCandle[] = [];

/**
 * `?surge=1` 강제 모드의 각본.
 *
 * 실제 급등락과 같은 순서로 재현함. 변동이 0.4% 에 닿아 트랙을 미리 받고, 0.6% 에
 * 닿아 바뀌고, 가라앉아 돌아옴. 실제 기준으로는 최소 2분을 유지하고 쿨다운이
 * 10분이라 한 번 확인하는 데 12분이 걸려서 시간만 줄임. 돌아온 뒤 같은 순서를
 * 되풀이해 들어가는 전환과 나오는 전환을 몇 번이고 들어 볼 수 있음.
 */
const SURGE_DEBUG_SCRIPT = {
  /** 재생을 켠 뒤 미리 받기 시작하는 시각. */
  prefetchAfterMs: 5 * 1000,
  /** 재생을 켠 뒤(또는 돌아온 뒤) 교체 트랙으로 바꾸는 시각. */
  enterAfterMs: 10 * 1000,
  /** 교체 트랙을 유지하는 시간. */
  holdMs: 30 * 1000,
} as const;

/**
 * `?surge=1` 이면 시세와 무관하게 교체 트랙을 강제로 돌린다.
 *
 * 개발 환경에서만 동작한다. 실제 기준(이전 30분봉 종가 대비 ±0.6%)은 하루 세 번꼴이라 눈앞에서
 * 확인할 수가 없다. 더미 아바타(`?dummies=`)와 같은 방침으로, 운영에서 임의로
 * 음악이 바뀌면 안 되므로 빌드에서 꺼 둔다.
 */
const resolveForcedSurgeFromLocation = (): boolean => {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("surge") === "1";
};

/**
 * 공간 배경음악.
 *
 * `HTMLAudioElement` 를 직접 들고 있다. three 씬 안의 소리가 아니라 화면 전체에
 * 깔리는 배경음이라 위치·거리 감쇠가 필요 없고, `PositionalAudio` 를 쓰면 매
 * 프레임 리스너를 갱신하는 비용만 더해진다.
 *
 * 요소는 처음 켤 때 만든다. 미리 만들어 두면 배경음악을 켜지 않는 사람도 음원
 * 요청 비용을 낸다. 급등락 트랙은 한 번 더 미뤄 변동이 기준에 다가갈 때 만든다.
 */
const useSpaceBgm = (): SpaceBgm => {
  // region [Hooks]
  const baseAudioRef = useRef<HTMLAudioElement | null>(null);
  const surgeAudioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** 전환마다 오름. `play()` 를 기다리던 전환이 그새 낡았는지 가린다. */
  const fadeIdRef = useRef<number>(0);
  const surgeStateRef = useRef<SurgeState>(createSurgeState());
  /**
   * 기준가를 고를 전광판 30분봉. 전광판과 같은 조회라 캐시를 같이 씀.
   * 판정 타이머가 읽으므로 상태가 아니라 ref 에 둔다.
   */
  const { data: candles } = useBtcCandlesQuery();
  const candlesRef = useRef<readonly BtcCandle[]>(EMPTY_CANDLES);
  /**
   * 지금(끈 상태면 끄기 직전) 깔린 쪽이 급등락 트랙인지.
   *
   * 끌 때 지우지 않는다. 급등락 중에 껐다 켜면 기본 트랙을 다시 들려줄 이유가
   * 없어서, 다시 켤 때 이 값을 보고 급등락 트랙으로 바로 들어간다.
   */
  const isOnSurgeTrackRef = useRef<boolean>(false);
  /** 재생을 시작한 시각. 켜자마자 교체되지 않게 유예를 재는 데 쓴다. */
  const playbackStartedAtRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isUnavailable, setIsUnavailable] = useState<boolean>(false);
  const [isSurging, setIsSurging] = useState<boolean>(false);
  // endregion

  // region [Privates]
  const createTrackElement = useCallback((src: string, volume: number): HTMLAudioElement => {
    const audioElement = new Audio(src);
    audioElement.loop = true;
    audioElement.volume = volume;
    // 음원을 못 받는 상황은 `play()` 가 거부되지 않고 `error` 로만 오기도 한다.
    audioElement.addEventListener("error", () => {
      setIsUnavailable(true);
      setIsPlaying(false);
    });

    return audioElement;
  }, []);

  const resolveBaseAudio = useCallback((): HTMLAudioElement => {
    baseAudioRef.current ??= createTrackElement(SPACE_BGM_TRACK_SRC, SPACE_BGM_VOLUME);

    return baseAudioRef.current;
  }, [createTrackElement]);

  /**
   * 급등락 트랙. 음원을 못 받아도 기본 배경음은 계속 가야 하므로 `error` 를
   * 공용 처리에 맡기지 않고 혼자 삼킨다.
   */
  const resolveSurgeAudio = useCallback((): HTMLAudioElement => {
    if (!surgeAudioRef.current) {
      const audioElement = new Audio(SPACE_BGM_SURGE_TRACK_SRC);
      audioElement.loop = true;
      audioElement.volume = 0;
      // 미리 받을 때 메타데이터만 받고 멈추지 않게 함.
      audioElement.preload = "auto";
      surgeAudioRef.current = audioElement;
    }

    return surgeAudioRef.current;
  }, []);

  /** 진행 중인 페이드와 아직 `play()` 를 기다리는 전환을 함께 무른다. */
  const stopFade = useCallback((): void => {
    fadeIdRef.current += 1;

    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const runFade = useCallback(
    (from: HTMLAudioElement | null, to: HTMLAudioElement, toVolume: number): void => {
      const startedAtMs = Date.now();
      const fromStartVolume = from?.volume ?? 0;

      fadeTimerRef.current = setInterval(() => {
        const progress = Math.min((Date.now() - startedAtMs) / CROSSFADE_MS, 1);

        to.volume = toVolume * progress;
        if (from) {
          from.volume = fromStartVolume * (1 - progress);
        }

        if (progress < 1) {
          return;
        }

        clearInterval(fadeTimerRef.current ?? undefined);
        fadeTimerRef.current = null;
        from?.pause();
      }, CROSSFADE_STEP_MS);
    },
    [],
  );

  /**
   * 한 트랙을 줄이면서 다른 트랙을 키움.
   *
   * 물러나는 쪽은 `pause()` 만 하고 재생 위치를 건드리지 않는다. 기본 트랙이
   * 멈췄던 자리에서 이어져야 돌아왔을 때 처음부터 다시 시작하지 않는다.
   *
   * 페이드는 `play()` 가 실제로 시작된 뒤에 건다. 급등락 트랙은 처음 바뀔 때
   * 받기 시작해서, 먼저 줄이면 받는 동안 원래 곡만 꺼져 소리가 빈다.
   * 기다리는 사이 다른 전환이나 끄기가 끼어들면 늦게 온 결과는 버린다.
   */
  const crossfade = useCallback(
    (from: HTMLAudioElement | null, to: HTMLAudioElement, toVolume: number): void => {
      stopFade();

      const fadeId = fadeIdRef.current;

      void to
        .play()
        .then(() => {
          if (fadeId === fadeIdRef.current) {
            runFade(from, to, toVolume);
          }
        })
        .catch(() => {
          // 교체 트랙을 못 틀면 원래 트랙을 그대로 둔다. 배경음이 사라지는 게 더 나쁘다.
        });
    },
    [runFade, stopFade],
  );

  /** 급등락 트랙으로. 돌아올 기본 트랙은 위치를 지킨 채 멈춘다. */
  const enterSurgeTrack = useCallback((): void => {
    const surgeAudio = resolveSurgeAudio();
    // 이벤트마다 곡 처음부터. 지난 이벤트가 끊긴 자리에서 이어지면 어색하다.
    surgeAudio.currentTime = 0;
    surgeAudio.volume = 0;
    crossfade(baseAudioRef.current, surgeAudio, SPACE_BGM_SURGE_VOLUME);
    isOnSurgeTrackRef.current = true;
    setIsSurging(true);
  }, [crossfade, resolveSurgeAudio]);

  const leaveSurgeTrack = useCallback((): void => {
    crossfade(surgeAudioRef.current, resolveBaseAudio(), SPACE_BGM_VOLUME);
    isOnSurgeTrackRef.current = false;
    setIsSurging(false);
  }, [crossfade, resolveBaseAudio]);

  /**
   * 다시 켤 때 급등락 트랙으로 바로 들어갈지.
   *
   * 끄기 직전이 급등락 트랙이었고 지금도 급등락 중일 때만 그렇다. 끈 동안은 시세를
   * 안 모아서, 지금 시세를 한 점 넣고 상태기계를 한 번 돌려 본다. 그사이 가라앉았으면
   * 여기서 해제돼 쿨다운도 이어진다. 강제 모드는 시세를 안 보므로 끄기 직전 트랙을 따른다.
   */
  const resolveShouldResumeSurge = useCallback((): boolean => {
    if (!isOnSurgeTrackRef.current) {
      return false;
    }

    if (resolveForcedSurgeFromLocation()) {
      return true;
    }

    const nowMs = Date.now();
    const { usd } = useBitcoinStore.getState().bitcoinPrice;
    const sampled = appendPriceSample(surgeStateRef.current, usd, nowMs);

    surgeStateRef.current = stepSurgeState(
      sampled,
      resolveReferencePrice(candlesRef.current, nowMs),
      nowMs,
    );

    return surgeStateRef.current.isSurging;
  }, []);

  /**
   * 재생을 시작하고 성공 여부를 돌려준다.
   *
   * 사용자 조작 없이 호출하면 브라우저가 `NotAllowedError` 로 거부한다. 거부는
   * 오류가 아니라 "아직 조작이 없었다" 는 신호이므로 호출한 쪽이 판단하게 한다.
   *
   * 급등락 중에 껐다 켠 거면 유예 없이 급등락 트랙을 멈춘 자리에서 이어 튼다.
   * 유예는 기본 트랙을 들어 본 적 없는 사람에게 전환을 들려주려는 것이라
   * 이미 듣던 사람에게는 필요 없다.
   */
  const startPlayback = useCallback(async (): Promise<boolean> => {
    const shouldResumeSurge = resolveShouldResumeSurge();
    const audio = shouldResumeSurge ? resolveSurgeAudio() : resolveBaseAudio();

    try {
      audio.volume = shouldResumeSurge ? SPACE_BGM_SURGE_VOLUME : SPACE_BGM_VOLUME;
      await audio.play();
      isOnSurgeTrackRef.current = shouldResumeSurge;
      playbackStartedAtRef.current = Date.now();
      setIsPlaying(true);
      setIsSurging(shouldResumeSurge);

      return true;
    } catch (error) {
      setIsPlaying(false);

      const isBlockedByAutoplay = (error as DOMException).name === "NotAllowedError";

      // 급등락 트랙만 못 트는 거면 기본 트랙으로 다시 켠다. 배경음 전체를 내리면 안 된다.
      if (shouldResumeSurge && !isBlockedByAutoplay) {
        isOnSurgeTrackRef.current = false;
        surgeStateRef.current = {
          ...surgeStateRef.current,
          isSurging: false,
          endedAtMs: Date.now(),
        };

        return startPlayback();
      }

      // 자동재생 차단이 아니면 음원 자체를 쓸 수 없다는 뜻이다.
      if (!isBlockedByAutoplay) {
        setIsUnavailable(true);
      }

      return false;
    }
  }, [resolveBaseAudio, resolveShouldResumeSurge, resolveSurgeAudio]);

  const stopPlayback = useCallback((): void => {
    stopFade();
    baseAudioRef.current?.pause();
    surgeAudioRef.current?.pause();
    setIsPlaying(false);
    setIsSurging(false);
  }, [stopFade]);

  /**
   * 지난 방문에서 켜 둔 배경음악을 되살린다.
   *
   * 소리 있는 자동재생은 조작 전에는 막히므로, 거부되면 첫 조작까지 기다렸다가
   * 한 번 더 시도한다. 이미 동의한 선택이라 다시 묻지 않는다.
   */
  const restoreSavedPlayback = useCallback((): (() => void) | undefined => {
    if (!loadBgmEnabled()) {
      return;
    }

    let hasDetached = false;

    const playOnFirstGesture = (): void => {
      void startPlayback();
    };

    const detachGestureListeners = (): void => {
      hasDetached = true;

      for (const eventName of GESTURE_EVENT_NAMES) {
        window.removeEventListener(eventName, playOnFirstGesture);
      }
    };

    void startPlayback().then((hasStarted) => {
      if (hasStarted || hasDetached) {
        return;
      }

      for (const eventName of GESTURE_EVENT_NAMES) {
        window.addEventListener(eventName, playOnFirstGesture, { once: true });
      }
    });

    return detachGestureListeners;
  }, [startPlayback]);

  /** 공간을 떠나면 소리도 함께 끊는다. 다른 페이지에 배경음이 남으면 안 된다. */
  const releaseAudioElements = useCallback((): (() => void) => {
    return () => {
      stopFade();

      for (const ref of [baseAudioRef, surgeAudioRef]) {
        const audioElement = ref.current;

        if (!audioElement) {
          continue;
        }

        audioElement.pause();
        audioElement.removeAttribute("src");
        ref.current = null;
      }
    };
  }, [stopFade]);
  // endregion

  // region [Events]
  const onClickToggleBgm = useCallback((): void => {
    if (isPlaying) {
      stopPlayback();
      saveBgmEnabled(false);
      return;
    }

    saveBgmEnabled(true);
    void startPlayback();
  }, [isPlaying, startPlayback, stopPlayback]);
  // endregion

  // region [Life Cycles]
  useEffect(restoreSavedPlayback, [restoreSavedPlayback]);

  useEffect(releaseAudioElements, [releaseAudioElements]);

  useEffect(() => {
    candlesRef.current = candles ?? EMPTY_CANDLES;
  }, [candles]);

  /**
   * 재생 중일 때만 시세를 모으고 판정한다.
   *
   * 배경음악을 끈 사람에게는 바꿀 것이 없어 소켓 구독도 타이머도 두지 않는다.
   * 스토어는 선택자 구독 미들웨어가 없어 전체 상태를 받고 여기서 값을 꺼낸다.
   * 리렌더를 일으키지 않으려 상태가 아니라 ref 에 쌓는다.
   */
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    // 강제 모드는 시세를 보지 않는다. 구독도 창도 두지 않고 각본대로 트랙만 바꾼다.
    if (resolveForcedSurgeFromLocation()) {
      let scriptTimer: ReturnType<typeof setTimeout> | null = null;

      const scheduleLeave = (): void => {
        scriptTimer = setTimeout(() => {
          if (isDev) console.log("🎵 [surge=1] 기본 트랙으로 돌아옴");
          leaveSurgeTrack();
          scheduleEnter();
        }, SURGE_DEBUG_SCRIPT.holdMs);
      };

      const scheduleEnter = (): void => {
        scriptTimer = setTimeout(() => {
          if (isDev) console.log("🎵 [surge=1] 급등락 트랙으로 바꿈");
          enterSurgeTrack();
          scheduleLeave();
        }, SURGE_DEBUG_SCRIPT.enterAfterMs);
      };

      const prefetchTimer = setTimeout(() => {
        if (isDev) console.log("🎵 [surge=1] 급등락 트랙 미리 받기 시작");
        resolveSurgeAudio();
      }, SURGE_DEBUG_SCRIPT.prefetchAfterMs);

      // 급등락 트랙으로 다시 켜졌으면 유지 시간부터 이어 감.
      if (isOnSurgeTrackRef.current) {
        if (isDev) console.log("🎵 [surge=1] 급등락 트랙으로 바로 다시 켬");
        scheduleLeave();
      } else {
        scheduleEnter();
      }

      return () => {
        clearTimeout(prefetchTimer);
        if (scriptTimer) {
          clearTimeout(scriptTimer);
        }
      };
    }

    // 상태를 새로 만들지 않음. 껐다 켜도 급등락 중이면 그 판정과 쿨다운을 이어 가야 함.
    const collectPriceSample = (): void => {
      const { usd } = useBitcoinStore.getState().bitcoinPrice;

      surgeStateRef.current = appendPriceSample(surgeStateRef.current, usd, Date.now());
    };

    collectPriceSample();

    const unsubscribe = useBitcoinStore.subscribe(collectPriceSample);
    const tickTimer = setInterval(() => {
      const nowMs = Date.now();
      const previous = surgeStateRef.current;
      const referencePrice = resolveReferencePrice(candlesRef.current, nowMs);
      const next = stepSurgeState(previous, referencePrice, nowMs);
      const change = readCandleChangePercent(previous, referencePrice, nowMs);

      // 기준에 다가가면 교체 트랙을 미리 받아 둠. 요소를 만들면 받기 시작하고 한 번만 만듦.
      if (change !== null && Math.abs(change) >= SPACE_BGM_SURGE.prefetchPercent) {
        resolveSurgeAudio();
      }

      surgeStateRef.current = next;

      if (next.isSurging === previous.isSurging) {
        return;
      }

      // 켜자마자 이미 급등락 중이면 유예를 둬 기본 트랙을 먼저 들려준다.
      if (next.isSurging && nowMs - playbackStartedAtRef.current < SURGE_START_GRACE_MS) {
        surgeStateRef.current = previous;
        return;
      }

      if (next.isSurging) {
        enterSurgeTrack();
        return;
      }

      leaveSurgeTrack();
    }, SURGE_TICK_MS);

    return () => {
      unsubscribe();
      clearInterval(tickTimer);
    };
  }, [isPlaying, enterSurgeTrack, leaveSurgeTrack, resolveSurgeAudio]);
  // endregion

  return { isPlaying, isUnavailable, isSurging, toggle: onClickToggleBgm };
};

export default useSpaceBgm;
