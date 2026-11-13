"use client";

import dynamic from "next/dynamic";
import { memo, type ReactNode, useCallback, useEffect, useState } from "react";
import { type ChatIdentity, loadOrCreateChatIdentity } from "@/features/chat-session";
import { resolveSpaceAvatarCount } from "../lib/avatarCapacity";

/**
 * three 는 라우트 단위로만 내려받는다. 정적 import 하면 공용 번들에 섞여
 * `/space` 를 열지 않는 사용자도 비용을 낸다.
 */
const SpaceCanvas = dynamic(() => import("./SpaceCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#06080e]" />,
});

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

  return resolveSpaceAvatarCount(parsedCount);
};

/**
 * `?boss=1` 로 보스 미리보기를 켠다.
 *
 * 개발 환경에서만 동작한다. 서버 보스가 붙기 전의 흉내 보스라 운영에 보이면 안 된다.
 */
const resolveBossPreviewFromLocation = (): boolean => {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return new URLSearchParams(window.location.search).get("boss") === "1";
};
// endregion

function SpaceView(): ReactNode {
  // region [Hooks]
  const [identity, setIdentity] = useState<ChatIdentity | null>(null);
  const [dummyCount, setDummyCount] = useState<number>(0);
  const [hasBossPreview, setHasBossPreview] = useState<boolean>(false);
  // endregion

  // region [Privates]
  const initializeSpace = useCallback((): void => {
    // localStorage 접근이라 클라이언트에서만 읽는다. 채팅과 같은 키를 써서
    // 같은 사용자가 두 기능에서 같은 정체성을 갖게 한다.
    setIdentity(loadOrCreateChatIdentity());
    setDummyCount(resolveDummyCountFromLocation());
    setHasBossPreview(resolveBossPreviewFromLocation());
  }, []);
  // endregion

  // region [Life Cycles]
  useEffect(initializeSpace, [initializeSpace]);
  // endregion

  // region [Templates]
  if (!identity) {
    return <div className="h-full w-full bg-[#06080e]" />;
  }
  // endregion

  return (
    <SpaceCanvas identity={identity} dummyCount={dummyCount} hasBossPreview={hasBossPreview} />
  );
}

const MemoizedSpaceView = memo(SpaceView);
MemoizedSpaceView.displayName = "SpaceView";

export default MemoizedSpaceView;
