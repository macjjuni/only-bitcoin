"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { spaceConfig } from "@/shared/config/space";
import { SpaceSessionController, type SpaceSessionIdentity } from "../api/spaceSessionController";

export interface UseSpaceSessionOptions {
  identity: SpaceSessionIdentity;
  enabled: boolean;
}

export type SpaceSession = ReturnType<typeof useSpaceSession>;

/** 브라우저와 PWA에서 같은 공간 세션을 사용하며 DOM 수명에 맞춰 연결을 정리한다. */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export const useSpaceSession = ({ identity, enabled }: UseSpaceSessionOptions) => {
  // region [Hooks]
  const controller = useMemo(
    () => new SpaceSessionController({ identity, webSocketUrl: spaceConfig.webSocketUrl }),
    [identity.clientKey, identity.nickname],
  );
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
    sendMessage: controller.sendMessage,
    retry: controller.retry,
  };
};
