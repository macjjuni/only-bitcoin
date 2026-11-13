"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, useRef } from "react";
import type { Group } from "three";
import type { PlayerTransform } from "@/entities/space";
import type { SpaceSession } from "@/features/space-session";
import { SPACE_FRAME_PRIORITY } from "@/views/space/lib/framePriority";
import {
  resolveNameplateDistanceFactor,
  resolveNameplateLiftY,
} from "@/views/space/lib/overlayLayout";
import { useBossHud } from "@/views/space/model/useBossHud";

/** 내 체력이 이 비율 아래면 체력바를 위험 색으로 바꿈. */
const LOW_HEALTH_RATIO = 0.3;

interface SelfHealthBarProps {
  session: SpaceSession;
  /** 내 아바타 모델 번호. 명찰과 같은 높이에 맞추려고 받음. */
  modelIndex: number;
  isCoarsePointer: boolean;
  /** 내 위치. 매 프레임 바뀌므로 ref 로 받는다. */
  viewerTransformRef: React.RefObject<PlayerTransform>;
}

/**
 * 내 명찰 바로 아래에 붙는 체력바.
 *
 * 다쳤거나 보스가 있는 안뜰에 나와 있을 때만 뜸(`resolveBossHudView`). 명찰과 같은 자리에
 * 같은 배율로 띄우고 아래로 조금 내려서, 명찰을 건드리지 않고 그 밑에 붙어 보이게 함.
 * 남의 체력은 서버가 안 알려 줘서 내 것만 그림.
 *
 * 체력 값은 1초에 몇 번 바뀜. `Nameplates` 에 넣으면 명찰 전체가 같이 다시 그려져서 뗐음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SelfHealthBar({ session, modelIndex, isCoarsePointer, viewerTransformRef }: SelfHealthBarProps): ReactNode {
  // region [Hooks]
  const groupRef = useRef<Group>(null);
  const view = useBossHud(session);
  // endregion


  // region [Privates]
  const isLowHealth = (view.playerBar?.ratio ?? 1) <= LOW_HEALTH_RATIO;
  // endregion


  // region [Life Cycles]
  useFrame(() => {
    const viewer = viewerTransformRef.current;

    if (viewer) {
      groupRef.current?.position.set(
        viewer.x,
        viewer.y + resolveNameplateLiftY(modelIndex),
        viewer.z,
      );
    }
  }, SPACE_FRAME_PRIORITY.overlay);
  // endregion

  return (
    <group ref={groupRef}>
      {view.playerBar && (
        <Html
          center
          distanceFactor={resolveNameplateDistanceFactor(isCoarsePointer)}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: "none" }}
        >
          {/* 명찰(높이 20px)의 아래 끝에서 3px 띄움. */}
          <div
            role="progressbar"
            aria-label="내 체력"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={view.playerBar.health}
            className="h-2 w-20 translate-y-[17px] overflow-hidden rounded-full bg-black/65"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-300 ease-out ${isLowHealth ? "bg-red-400" : "bg-green-500"}`}
              style={{ width: `${view.playerBar.ratio * 100}%` }}
            />
          </div>
        </Html>
      )}
    </group>
  );
}

const MemoizedSelfHealthBar = memo(SelfHealthBar);
MemoizedSelfHealthBar.displayName = "SelfHealthBar";

export default MemoizedSelfHealthBar;
