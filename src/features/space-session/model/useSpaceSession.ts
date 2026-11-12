"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { spaceConfig } from "@/shared/config/space";
import { createDelayedSocket, resolveDebugSocketDelayMs } from "../api/delayedSocket";
import { SpaceSessionController, type SpaceSessionIdentity } from "../api/spaceSessionController";

export interface UseSpaceSessionOptions {
  identity: SpaceSessionIdentity;
  /** 입장할 때 보낼 아바타 모델. 바꿀 때는 `changeModel` 을 씀. */
  modelIndex: number;
  enabled: boolean;
}

export type SpaceSession = ReturnType<typeof useSpaceSession>;

/** 브라우저와 PWA에서 같은 공간 세션을 사용하며 DOM 수명에 맞춰 연결을 정리함. */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export const useSpaceSession = ({ identity, modelIndex, enabled }: UseSpaceSessionOptions) => {
  // region [Hooks]
  /**
   * 닉네임은 의존성에 넣지 않음.
   *
   * 넣으면 이름을 바꿀 때마다 컨트롤러가 새로 만들어져 연결이 끊기고 좌석과
   * 위치를 잃음. 변경은 `changeNickname` 이 `nick` 프레임으로 처리함.
   * 아바타 모델도 같은 이유로 의존성에서 뺀다(`changeModel`).
   */
  const controller = useMemo(() => {
    // 개발 모드에서 `?lag=200` 을 붙이면 편도 200ms 지연을 걸어 봄.
    const debugDelayMs =
      typeof window === "undefined"
        ? 0
        : resolveDebugSocketDelayMs(
            window.location.search,
            process.env.NODE_ENV === "development",
          );

    return new SpaceSessionController({
      identity,
      modelIndex,
      webSocketUrl: spaceConfig.webSocketUrl,
      ...(debugDelayMs > 0
        ? { createSocket: (url: string) => createDelayedSocket(new WebSocket(url), debugDelayMs) }
        : {}),
    });
  }, [identity.clientKey]);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  // endregion


  // region [Events]
  const onChangeVisibilityDocument = (): void => {
    controller.setVisibility(!document.hidden);
  };

  const onOnlineWindow = (): void => {
    controller.setOnline(true);
  };

  const onOfflineWindow = (): void => {
    controller.setOnline(false);
  };
  // endregion


  // region [Privates]
  const startSession = (): (() => void) => {
    controller.setVisibility(!document.hidden);
    controller.setOnline(navigator.onLine);
    controller.start();
    document.addEventListener("visibilitychange", onChangeVisibilityDocument);
    window.addEventListener("online", onOnlineWindow);
    window.addEventListener("offline", onOfflineWindow);

    return () => {
      document.removeEventListener("visibilitychange", onChangeVisibilityDocument);
      window.removeEventListener("online", onOnlineWindow);
      window.removeEventListener("offline", onOfflineWindow);
      controller.stop();
    };
  };
  // endregion


  // region [Life Cycles]
  useEffect(() => {
    if (!enabled) {
      return;
    }

    return startSession();
  }, [controller, enabled]);
  // endregion


  return {
    ...snapshot,
    isConnectionConfigured: spaceConfig.isConnectionConfigured,
    publishMovement: controller.publishMovement,
    sampleRemotePlayers: controller.sampleRemotePlayers,
    sendKick: controller.sendKick,
    requestCelebration: controller.requestCelebration,
    drainKickEvents: controller.drainKickEvents,
    setHiddenHitHandler: controller.setHiddenHitHandler,
    sendMessage: controller.sendMessage,
    changeNickname: controller.changeNickname,
    changeModel: controller.changeModel,
    retry: controller.retry,
  };
};
