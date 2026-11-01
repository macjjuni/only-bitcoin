"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import {
  type PlayerTransform,
  type RemotePlayer,
  SPACE_AVATAR,
  SPACE_OVERLAY_LIMITS,
} from "@/entities/space";
import { selectNearestVisible } from "@/views/space/lib/avatarCulling";

/** 명찰 선별 주기. 매 프레임 고르면 React 상태가 60 Hz 로 갱신된다. */
const SELECTION_INTERVAL_MS = 200;
const NAMEPLATE_LIFT_Y = SPACE_AVATAR.headCenterY + 0.55;

interface NameplatesProps {
  players: readonly RemotePlayer[];
  selfNickname: string;
  /** 같은 배열의 닉네임 갱신에도 memo가 다시 렌더되게 한다. */
  rosterRevision?: number;
  /** 거리 기준점. 매 프레임 바뀌므로 ref 로 받는다. */
  viewerTransformRef: React.RefObject<PlayerTransform>;
}

/**
 * 아바타 명찰.
 *
 * `<Html>` 은 DOM 이라 개수가 곧 레이아웃 비용이다. 거리와 개수로 잘라낸다.
 * 좌석 선별은 5 Hz 로 하고 위치는 매 프레임 그룹 변환으로 갱신한다.
 * 퇴장한 좌석은 다음 선별 주기를 기다리지 않고 즉시 렌더 목록에서 제외한다.
 */
function Nameplates({
  players,
  selfNickname,
  rosterRevision,
  viewerTransformRef,
}: NameplatesProps): ReactNode {
  // region [Hooks]
  const selfGroupRef = useRef<Group>(null);
  const remoteGroupRefs = useRef(new Map<number, Group>());
  const lastSelectedAtRef = useRef<number>(0);
  const [visibleSeats, setVisibleSeats] = useState<number[]>([]);
  // endregion

  // region [Privates]
  const playersBySeat = useMemo(() => {
    return new Map(players.map((player) => [player.seat, player]));
  }, [players, rosterRevision]);
  const visiblePlayers = visibleSeats.flatMap((seat) => {
    const player = playersBySeat.get(seat);
    return player ? [player] : [];
  });

  const selectVisibleSeats = (viewer: PlayerTransform): void => {
    const nearestPlayers = selectNearestVisible(players, viewer, {
      maxDistance: SPACE_OVERLAY_LIMITS.nameplateMaxDistance,
      maxCount: SPACE_OVERLAY_LIMITS.nameplateMaxCount,
    });
    const nextSeats = nearestPlayers.map(({ seat }) => seat);

    setVisibleSeats((previousSeats) => {
      const hasSameSeats =
        previousSeats.length === nextSeats.length &&
        previousSeats.every((seat, index) => seat === nextSeats[index]);

      return hasSameSeats ? previousSeats : nextSeats;
    });
  };

  const applySlotPositions = (): void => {
    for (const player of visiblePlayers) {
      remoteGroupRefs.current
        .get(player.seat)
        ?.position.set(player.x, player.y + NAMEPLATE_LIFT_Y, player.z);
    }
  };
  // endregion

  // region [Life Cycles]
  useFrame(({ clock }) => {
    const viewer = viewerTransformRef.current;

    if (!viewer) {
      return;
    }

    selfGroupRef.current?.position.set(viewer.x, viewer.y + NAMEPLATE_LIFT_Y, viewer.z);

    const nowMs = clock.elapsedTime * 1000;

    if (nowMs - lastSelectedAtRef.current >= SELECTION_INTERVAL_MS) {
      lastSelectedAtRef.current = nowMs;
      selectVisibleSeats(viewer);
    }

    applySlotPositions();
  });
  // endregion

  return (
    <>
      <group ref={selfGroupRef}>
        <Html center distanceFactor={18} zIndexRange={[20, 0]}>
          <span className="whitespace-nowrap rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
            {selfNickname}
          </span>
        </Html>
      </group>
      {visiblePlayers.map((player) => (
        <group
          key={player.seat}
          ref={(group) => {
            if (group) {
              remoteGroupRefs.current.set(player.seat, group);
            } else {
              remoteGroupRefs.current.delete(player.seat);
            }
          }}
        >
          <Html center distanceFactor={18} zIndexRange={[20, 0]}>
            <span className="whitespace-nowrap rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm">
              {player.nickname}
            </span>
          </Html>
        </group>
      ))}
    </>
  );
}

const MemoizedNameplates = memo(Nameplates);
MemoizedNameplates.displayName = "Nameplates";

export default MemoizedNameplates;
