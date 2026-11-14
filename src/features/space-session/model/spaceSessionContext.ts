"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import type { SpaceSessionSnapshot } from "../api/spaceSessionController";
import type { SpaceSession } from "./useSpaceSession";

/**
 * 세션을 하위 컴포넌트로 내리는 통로. 세션을 만든 쪽(`SpaceCanvas`)이 채움.
 *
 * R3F 캔버스 안에서도 그대로 읽힘(캔버스가 바깥 컨텍스트를 이어 줌).
 */
export const SpaceSessionContext = createContext<SpaceSession | null>(null);

/** 세션 상태에서 쓸 조각을 고름. */
export type SpaceSessionSelector<Selected> = (snapshot: SpaceSessionSnapshot) => Selected;

/** 컨텍스트의 세션. 동작(`sendKick` 등)과 렌더 밖에서 읽는 값(`getSnapshot`)을 여기서 꺼냄. */
export const useSpaceSessionContext = (): SpaceSession => {
  const session = useContext(SpaceSessionContext);

  if (!session) {
    throw new Error("SpaceSessionContext 밖에서 세션을 읽으려 함.");
  }

  return session;
};

/**
 * 세션 상태의 한 조각을 구독함. 그 조각이 바뀔 때만 다시 그림.
 *
 * **고르는 함수는 상태에 들어 있는 값을 그대로 돌려줘야 함.** 객체나 배열을 새로 만들어
 * 돌려주면 매번 다른 값으로 보여 끝없이 다시 그림. 여러 조각이 필요하면 여러 번 부름.
 *
 * 세션을 만든 컴포넌트는 컨텍스트 밖이라 이쪽에 세션을 직접 넘김.
 */
export const useSpaceSessionSelector = <Selected>(
  session: SpaceSession,
  selector: SpaceSessionSelector<Selected>,
): Selected => {
  const getSelected = (): Selected => selector(session.getSnapshot());

  return useSyncExternalStore(session.subscribe, getSelected, getSelected);
};

/** 컨텍스트의 세션에서 상태 한 조각을 구독함. 규칙은 `useSpaceSessionSelector` 와 같음. */
export const useSpaceSessionState = <Selected>(
  selector: SpaceSessionSelector<Selected>,
): Selected => {
  return useSpaceSessionSelector(useSpaceSessionContext(), selector);
};
