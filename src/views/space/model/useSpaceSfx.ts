"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  createSpaceSfxPlayer,
  SPACE_SFX,
  type SpaceSfxName,
  type SpaceSfxPlayer,
} from "@/views/space/lib/spaceSfx";

export type PlaySpaceSfx = (name: SpaceSfxName, delaySeconds?: number) => void;

/**
 * `?sfx=bossSpawn` 처럼 효과음 이름을 주면 화면을 누를 때마다 그 소리를 틂. 확인용임.
 *
 * 등장·포효처럼 보스를 잡아야만 들리는 소리를 바로 들어 보려고 둠. 이름은 `SPACE_SFX` 의 키.
 * 내 소리만 나서 운영에서도 막지 않음.
 */
const readTestSfxName = (): SpaceSfxName | null => {
  const rawValue = new URLSearchParams(window.location.search).get("sfx");

  return rawValue !== null && Object.hasOwn(SPACE_SFX, rawValue)
    ? (rawValue as SpaceSfxName)
    : null;
};

/**
 * 효과음을 트는 함수. 배경음악을 켠 사람에게만 소리가 남.
 *
 * 돌려주는 함수는 바뀌지 않아서 `useFrame` 안에서 그대로 불러도 됨.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export const useSpaceSfx = (isEnabled: boolean): PlaySpaceSfx => {
  // region [Hooks]
  const playerRef = useRef<SpaceSfxPlayer | null>(null);
  const playSfx = useCallback<PlaySpaceSfx>((name, delaySeconds) => {
    playerRef.current?.play(name, delaySeconds);
  }, []);
  // endregion


  // region [Privates]
  const preparePlayer = (): (() => void) => {
    const player = createSpaceSfxPlayer();
    const testSfxName = readTestSfxName();
    const onGesture = (event: Event): void => {
      player.unlock();
      // 첫 조작은 음원을 받기 시작할 뿐이라 소리가 안 남. 두 번째부터 들림.
      if (testSfxName && event.type === "pointerdown") {
        player.play(testSfxName);
      }
    };

    playerRef.current = player;
    // 한 번만 듣고 떼지 않음. 모바일은 앱 전환 뒤 멈춘 소리를 다음 조작에서 깨워야 함.
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);

    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      playerRef.current = null;
      player.dispose();
    };
  };
  // endregion


  // region [Life Cycles]
  useEffect(preparePlayer, []);
  useEffect(() => {
    playerRef.current?.setEnabled(isEnabled);
  }, [isEnabled]);
  // endregion

  return playSfx;
};
