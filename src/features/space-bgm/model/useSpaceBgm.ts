"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadBgmEnabled, saveBgmEnabled } from "./bgmPreferenceStore";
import { SPACE_BGM_TRACK_SRC, SPACE_BGM_VOLUME } from "./spaceBgmTrack";

export interface SpaceBgm {
  isPlaying: boolean;
  /**
   * 음원을 재생할 수 없는 상태. 파일이 없거나 브라우저가 코덱을 못 읽는 경우다.
   * 이때는 눌러도 아무 일이 없으므로 HUD 버튼 자체를 내린다.
   */
  isUnavailable: boolean;
  toggle: () => void;
}

/** 첫 조작을 기다릴 때 들을 이벤트. 공간에 들어오면 곧 누르거나 키를 치게 된다. */
const GESTURE_EVENT_NAMES = ["pointerdown", "keydown"] as const;

/**
 * 공간 배경음악.
 *
 * `HTMLAudioElement` 를 직접 들고 있다. three 씬 안의 소리가 아니라 화면 전체에
 * 깔리는 배경음이라 위치·거리 감쇠가 필요 없고, `PositionalAudio` 를 쓰면 매
 * 프레임 리스너를 갱신하는 비용만 더해진다.
 *
 * 요소는 처음 켤 때 만든다. 미리 만들어 두면 배경음악을 켜지 않는 사람도 음원
 * 요청 비용을 낸다.
 */
const useSpaceBgm = (): SpaceBgm => {
  // region [Hooks]
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isUnavailable, setIsUnavailable] = useState<boolean>(false);
  // endregion

  // region [Privates]
  const resolveAudioElement = useCallback((): HTMLAudioElement => {
    if (audioRef.current) {
      return audioRef.current;
    }

    const audioElement = new Audio(SPACE_BGM_TRACK_SRC);
    audioElement.loop = true;
    audioElement.volume = SPACE_BGM_VOLUME;
    // 음원을 못 받는 상황은 `play()` 가 거부되지 않고 `error` 로만 오기도 한다.
    audioElement.addEventListener("error", () => {
      setIsUnavailable(true);
      setIsPlaying(false);
    });

    audioRef.current = audioElement;

    return audioElement;
  }, []);

  /**
   * 재생을 시작하고 성공 여부를 돌려준다.
   *
   * 사용자 조작 없이 호출하면 브라우저가 `NotAllowedError` 로 거부한다. 거부는
   * 오류가 아니라 "아직 조작이 없었다" 는 신호이므로 호출한 쪽이 판단하게 한다.
   */
  const startPlayback = useCallback(async (): Promise<boolean> => {
    try {
      await resolveAudioElement().play();
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
  }, [resolveAudioElement]);

  const stopPlayback = useCallback((): void => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

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
  const releaseAudioElement = useCallback((): (() => void) => {
    return () => {
      const audioElement = audioRef.current;

      if (!audioElement) {
        return;
      }

      audioElement.pause();
      audioElement.removeAttribute("src");
      audioRef.current = null;
    };
  }, []);
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

  useEffect(releaseAudioElement, [releaseAudioElement]);
  // endregion

  return { isPlaying, isUnavailable, toggle: onClickToggleBgm };
};

export default useSpaceBgm;
