"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type BtcCandle, useBitcoinStore } from "@/entities/bitcoin";
import { useBtcCandlesQuery } from "@/entities/bitcoin/client";
import { loadBgmEnabled, saveBgmEnabled } from "./bgmPreferenceStore";
import {
  appendPriceSample,
  createSurgeState,
  resolveReferencePrice,
  type SurgeState,
  stepSurgeState,
} from "./priceSurge";
import { SPACE_BGM_SURGE_TRACK_SRC, SPACE_BGM_TRACK_SRC, SPACE_BGM_VOLUME } from "./spaceBgmTrack";

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
 * `?surge=1` 강제 모드에서 트랙을 뒤집는 주기.
 *
 * 들어가고 나오는 전환을 둘 다 들어야 하는데, 실제 기준으로는 최소 2분을 유지하고
 * 쿨다운이 10분이라 한 번 확인하는 데 12분이 걸린다. 강제 모드는 상태기계를
 * 건너뛰므로 유지·쿨다운에 묶이지 않는다.
 */
const SURGE_DEBUG_CYCLE_MS = 20 * 1000;

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
 * 요청 비용을 낸다. 급등락 트랙은 한 번 더 미뤄 실제로 바뀔 때 만든다.
 */
const useSpaceBgm = (): SpaceBgm => {
  // region [Hooks]
  const baseAudioRef = useRef<HTMLAudioElement | null>(null);
  const surgeAudioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const surgeStateRef = useRef<SurgeState>(createSurgeState());
  /**
   * 기준가를 고를 전광판 30분봉. 전광판과 같은 조회라 캐시를 같이 씀.
   * 판정 타이머가 읽으므로 상태가 아니라 ref 에 둔다.
   */
  const { data: candles } = useBtcCandlesQuery();
  const candlesRef = useRef<readonly BtcCandle[]>(EMPTY_CANDLES);
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
      surgeAudioRef.current = audioElement;
    }

    return surgeAudioRef.current;
  }, []);

  const stopFade = useCallback((): void => {
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  /**
   * 한 트랙을 줄이면서 다른 트랙을 키움.
   *
   * 물러나는 쪽은 `pause()` 만 하고 재생 위치를 건드리지 않는다. 기본 트랙이
   * 멈췄던 자리에서 이어져야 돌아왔을 때 처음부터 다시 시작하지 않는다.
   */
  const crossfade = useCallback(
    (from: HTMLAudioElement | null, to: HTMLAudioElement): void => {
      stopFade();

      const startedAtMs = Date.now();
      const fromStartVolume = from?.volume ?? 0;

      void to.play().catch(() => {
        // 교체 트랙을 못 틀면 원래 트랙을 그대로 둔다. 배경음이 사라지는 게 더 나쁘다.
        stopFade();
        if (from) {
          from.volume = fromStartVolume;
        }
      });

      fadeTimerRef.current = setInterval(() => {
        const progress = Math.min((Date.now() - startedAtMs) / CROSSFADE_MS, 1);

        to.volume = SPACE_BGM_VOLUME * progress;
        if (from) {
          from.volume = fromStartVolume * (1 - progress);
        }

        if (progress < 1) {
          return;
        }

        stopFade();
        from?.pause();
      }, CROSSFADE_STEP_MS);
    },
    [stopFade],
  );

  /** 급등락 트랙으로. 돌아올 기본 트랙은 위치를 지킨 채 멈춘다. */
  const enterSurgeTrack = useCallback((): void => {
    const surgeAudio = resolveSurgeAudio();
    // 이벤트마다 곡 처음부터. 지난 이벤트가 끊긴 자리에서 이어지면 어색하다.
    surgeAudio.currentTime = 0;
    surgeAudio.volume = 0;
    crossfade(baseAudioRef.current, surgeAudio);
    setIsSurging(true);
  }, [crossfade, resolveSurgeAudio]);

  const leaveSurgeTrack = useCallback((): void => {
    crossfade(surgeAudioRef.current, resolveBaseAudio());
    setIsSurging(false);
  }, [crossfade, resolveBaseAudio]);

  /**
   * 재생을 시작하고 성공 여부를 돌려준다.
   *
   * 사용자 조작 없이 호출하면 브라우저가 `NotAllowedError` 로 거부한다. 거부는
   * 오류가 아니라 "아직 조작이 없었다" 는 신호이므로 호출한 쪽이 판단하게 한다.
   */
  const startPlayback = useCallback(async (): Promise<boolean> => {
    const baseAudio = resolveBaseAudio();

    try {
      baseAudio.volume = SPACE_BGM_VOLUME;
      await baseAudio.play();
      playbackStartedAtRef.current = Date.now();
      setIsPlaying(true);

      return true;
    } catch (error) {
      setIsPlaying(false);

      // 자동재생 차단이 아니면 음원 자체를 쓸 수 없다는 뜻이다.
      if ((error as DOMException).name !== "NotAllowedError") {
        setIsUnavailable(true);
      }

      return false;
    }
  }, [resolveBaseAudio]);

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

    // 강제 모드는 시세를 보지 않는다. 구독도 창도 두지 않고 트랙만 번갈아 바꾼다.
    if (resolveForcedSurgeFromLocation()) {
      let isSurgeTrackOn = false;
      const flipTimer = setInterval(() => {
        isSurgeTrackOn = !isSurgeTrackOn;

        if (isSurgeTrackOn) {
          enterSurgeTrack();
          return;
        }

        leaveSurgeTrack();
      }, SURGE_DEBUG_CYCLE_MS);

      return () => {
        clearInterval(flipTimer);
      };
    }

    surgeStateRef.current = createSurgeState();

    const collectPriceSample = (): void => {
      const { usd } = useBitcoinStore.getState().bitcoinPrice;

      surgeStateRef.current = appendPriceSample(surgeStateRef.current, usd, Date.now());
    };

    collectPriceSample();

    const unsubscribe = useBitcoinStore.subscribe(collectPriceSample);
    const tickTimer = setInterval(() => {
      const nowMs = Date.now();
      const previous = surgeStateRef.current;
      const next = stepSurgeState(
        previous,
        resolveReferencePrice(candlesRef.current, nowMs),
        nowMs,
      );

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
  }, [isPlaying, enterSurgeTrack, leaveSurgeTrack]);
  // endregion

  return { isPlaying, isUnavailable, isSurging, toggle: onClickToggleBgm };
};

export default useSpaceBgm;
