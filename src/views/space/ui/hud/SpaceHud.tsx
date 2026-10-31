"use client";

import { memo, type ReactNode } from "react";
import { SPACE_MAX_OCCUPANTS } from "@/entities/space";
import { type SpaceInputSource, VirtualJoystick } from "@/features/space-controls";

const KEYBOARD_GUIDE = [
  { keys: "W A S D", description: "이동" },
  { keys: "Shift", description: "달리기" },
  { keys: "드래그 / Q E", description: "시야 회전" },
] as const;

interface SpaceHudProps {
  inputSource: SpaceInputSource;
  occupantCount: number;
}

/**
 * 캔버스 위에 떠 있는 2D 조작 레이어.
 *
 * 조작 안내와 접속자 수를 DOM 으로 제공한다. 캔버스 안 텍스트에만 의존하면
 * 확대·스크린리더·WebGL 실패 상황에서 모두 읽히지 않는다.
 */
function SpaceHud({ inputSource, occupantCount }: SpaceHudProps): ReactNode {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-4 top-4 rounded-xl bg-black/50 px-3 py-2 backdrop-blur-sm">
        <p className="text-xs font-semibold text-white/90">
          접속 {occupantCount} / {SPACE_MAX_OCCUPANTS}
        </p>
      </div>

      <dl className="absolute right-4 top-4 hidden rounded-xl bg-black/50 px-3 py-2 backdrop-blur-sm sm:block">
        {KEYBOARD_GUIDE.map(({ keys, description }) => (
          <div key={keys} className="flex items-center gap-2 text-[11px] leading-5">
            <dt className="font-mono font-semibold text-bitcoin">{keys}</dt>
            <dd className="text-white/70">{description}</dd>
          </div>
        ))}
      </dl>

      <div className="pointer-events-auto sm:hidden">
        <VirtualJoystick inputSource={inputSource} />
      </div>
    </div>
  );
}

const MemoizedSpaceHud = memo(SpaceHud);
MemoizedSpaceHud.displayName = "SpaceHud";

export default MemoizedSpaceHud;
