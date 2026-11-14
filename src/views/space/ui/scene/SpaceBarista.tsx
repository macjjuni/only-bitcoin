"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, type RefObject, useRef, useState } from "react";
import type { RemotePlayer, SpaceTerrain } from "@/entities/space";
import { SPACE_BARISTA } from "@/views/space/lib/barista";
import {
  resolveNameplateDistanceFactor,
  resolveNameplateLiftY,
} from "@/views/space/lib/overlayLayout";
import RemoteAvatars, { type RemoteAvatarHit } from "./RemoteAvatars";

/**
 * 바리스타 한 명만 든 명단. 좌석은 이 묶음 안에서만 쓰는 번호라 실제 유저와 안 겹침.
 *
 * 매번 새 배열을 넘기면 아바타 묶음을 다시 계산해서 모듈에 한 번만 만들어 둠.
 */
const BARISTA_PLAYERS: readonly RemotePlayer[] = [
  {
    seat: 0,
    nickname: SPACE_BARISTA.name,
    colorIndex: SPACE_BARISTA.colorIndex,
    modelIndex: SPACE_BARISTA.modelIndex,
    x: SPACE_BARISTA.x,
    y: SPACE_BARISTA.y,
    z: SPACE_BARISTA.z,
    yaw: SPACE_BARISTA.yaw,
  },
];

interface SpaceBaristaProps {
  /** 접지 판정용. 유저 아바타와 같은 지형을 씀. */
  terrainRef: RefObject<SpaceTerrain>;
  /** 이름표 크기를 유저 명찰과 맞추는 데 씀. */
  isCoarsePointer: boolean;
}

/**
 * 커피 바에 서 있는 바리스타 NPC.
 *
 * 전용 모델이 준비되기 전이라 유저 아바타 그리는 코드를 그대로 빌려 한 명을 세워 둠.
 * 가만히 서서 대기 모션만 반복함. 말 걸기와 메뉴는 HUD(`SpaceBaristaMenu`)가 맡음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceBarista({ terrainRef, isCoarsePointer }: SpaceBaristaProps): ReactNode {
  // region [Hooks]
  /** 바리스타는 휘두르지도 맞지도 않아 늘 비어 있음. */
  const kickStartsRef = useRef(new Map<number, number>());
  const hitsRef = useRef(new Map<number, RemoteAvatarHit>());
  const [isNameReady, setIsNameReady] = useState<boolean>(false);
  // endregion


  // region [Life Cycles]
  useFrame(() => {
    // 첫 렌더에 같이 붙은 `<Html>` 은 씬이 서스펜드했다 돌아올 때 렌더 도중에 루트를 내리려다
    // 경고를 냄. 유저 명찰(`Nameplates`)처럼 첫 프레임이 돈 뒤에 붙임.
    if (!isNameReady) {
      setIsNameReady(true);
    }
  });
  // endregion

  return (
    <>
      <RemoteAvatars
        players={BARISTA_PLAYERS}
        terrainRef={terrainRef}
        kickStartsRef={kickStartsRef}
        hitsRef={hitsRef}
      />

      {isNameReady && (
        <group
          position={[
            SPACE_BARISTA.x,
            SPACE_BARISTA.y + resolveNameplateLiftY(SPACE_BARISTA.modelIndex),
            SPACE_BARISTA.z,
          ]}
        >
          <Html
            center
            distanceFactor={resolveNameplateDistanceFactor(isCoarsePointer)}
            zIndexRange={[20, 0]}
            style={{ pointerEvents: "none" }}
          >
            {/* 유저 명찰과 같은 모양에 글자색만 달리해 NPC 임을 알림. */}
            <span className="flex h-5 w-max select-none items-center whitespace-nowrap rounded-full bg-black/65 px-2 text-[11px] font-medium leading-none text-amber-200 backdrop-blur-sm">
              {SPACE_BARISTA.name}
            </span>
          </Html>
        </group>
      )}
    </>
  );
}

const MemoizedSpaceBarista = memo(SpaceBarista);
MemoizedSpaceBarista.displayName = "SpaceBarista";

export default MemoizedSpaceBarista;
