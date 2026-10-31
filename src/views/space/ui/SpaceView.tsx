"use client";

import dynamic from "next/dynamic";
import { memo, type ReactNode, useEffect, useState } from "react";
import { SPACE_MAX_OCCUPANTS } from "@/entities/space";
import { loadOrCreateChatIdentity } from "@/features/chat-session";

/**
 * three 는 라우트 단위로만 내려받는다. 정적 import 하면 공용 번들에 섞여
 * `/space` 를 열지 않는 사용자도 비용을 낸다.
 */
const SpaceCanvas = dynamic(() => import("./SpaceCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#06080e]" />,
});

/** 성능 측정용 더미 수 상한. 50석 설계에 여유를 보려면 2배까지 허용한다. */
const MAX_DUMMY_COUNT = SPACE_MAX_OCCUPANTS * 2;

// region [Privates]
/**
 * `?dummies=50` 으로 더미 아바타 수를 받는다.
 *
 * 개발 환경에서만 동작한다. 운영에서 임의로 50명을 띄울 수 있으면 안 된다.
 * `useSearchParams` 를 쓰면 정적 프리렌더가 Suspense 경계를 요구하는데,
 * 이 값은 클라이언트에서만 필요하므로 직접 읽는다.
 */
const resolveDummyCountFromLocation = (): number => {
  if (process.env.NODE_ENV === "production") {
    return 0;
  }

  const rawValue = new URLSearchParams(window.location.search).get("dummies");

  if (!rawValue) {
    return 0;
  }

  const parsedCount = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsedCount) || parsedCount <= 0) {
    return 0;
  }

  return Math.min(parsedCount, MAX_DUMMY_COUNT);
};
// endregion

function SpaceView(): ReactNode {
  // region [Hooks]
  const [clientKey, setClientKey] = useState<string>("");
  const [dummyCount, setDummyCount] = useState<number>(0);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    // localStorage 접근이라 클라이언트에서만 읽는다. 채팅과 같은 키를 써서
    // 같은 사용자가 두 기능에서 같은 정체성을 갖게 한다.
    setClientKey(loadOrCreateChatIdentity().clientKey);
    setDummyCount(resolveDummyCountFromLocation());
  }, []);
  // endregion

  // region [Templates]
  if (!clientKey) {
    return <div className="h-full w-full bg-[#06080e]" />;
  }
  // endregion

  return <SpaceCanvas clientKey={clientKey} dummyCount={dummyCount} />;
}

const MemoizedSpaceView = memo(SpaceView);
MemoizedSpaceView.displayName = "SpaceView";

export default MemoizedSpaceView;
