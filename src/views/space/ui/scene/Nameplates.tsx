"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { type PlayerTransform, type RemotePlayer, SPACE_OVERLAY_LIMITS } from "@/entities/space";
import { selectNearestVisible } from "@/views/space/lib/avatarCulling";
import { SPACE_FRAME_PRIORITY } from "@/views/space/lib/framePriority";
import {
  resolveNameplateDistanceFactor,
  resolveNameplateLiftY,
} from "@/views/space/lib/overlayLayout";

/** 명찰 선별 주기. 매 프레임 고르면 React 상태가 60 Hz 로 갱신된다. */
const SELECTION_INTERVAL_MS = 200;

interface NameplatesProps {
  players: readonly RemotePlayer[];
  selfNickname: string;
  /** 내 아바타 모델 번호. 모델마다 키가 달라 명찰 높이가 달라짐. */
  selfModelIndex: number;
  isCoarsePointer: boolean;
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
  selfModelIndex,
  isCoarsePointer,
  rosterRevision,
  viewerTransformRef,
}: NameplatesProps): ReactNode {
  // region [Hooks]
  const selfGroupRef = useRef<Group>(null);
  const remoteGroupRefs = useRef(new Map<number, Group>());
  const lastSelectedAtRef = useRef<number>(0);
  const [visibleSeats, setVisibleSeats] = useState<number[]>([]);
  const [isSelfReady, setIsSelfReady] = useState<boolean>(false);
  // endregion

  // region [Privates]
  const nameplateDistanceFactor = resolveNameplateDistanceFactor(isCoarsePointer);
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
        ?.position.set(player.x, player.y + resolveNameplateLiftY(player.modelIndex), player.z);
    }
  };

  /**
   * 그룹이 붙는 즉시 제자리로 보낸다.
   *
   * 새로 보이게 된 좌석의 `<group>` 은 원점(0, 0, 0)에서 마운트되고, `<Html>` 은
   * 그 프레임에 이미 화면 좌표를 계산한다. 다음 프레임에야 위치가 잡히므로
   * 명찰이 공간 중앙에서 한 번 깜빡인다.
   */
  const attachRemoteGroup = (player: RemotePlayer, group: Group | null): void => {
    if (!group) {
      remoteGroupRefs.current.delete(player.seat);
      return;
    }

    group.position.set(player.x, player.y + resolveNameplateLiftY(player.modelIndex), player.z);
    remoteGroupRefs.current.set(player.seat, group);
  };

  /**
   * 내 명찰 그룹이 붙는 즉시 내 위치로 보냄.
   *
   * 원점에서 마운트되면 `<Html>` 이 그 프레임에 공간 중앙 좌표로 한 번 그림.
   */
  const attachSelfGroup = (group: Group | null): void => {
    selfGroupRef.current = group;

    const viewer = viewerTransformRef.current;

    if (group && viewer) {
      group.position.set(viewer.x, viewer.y + resolveNameplateLiftY(selfModelIndex), viewer.z);
    }
  };
  // endregion

  // region [Life Cycles]
  useFrame(() => {
    const viewer = viewerTransformRef.current;

    if (!viewer) {
      return;
    }

    // 첫 렌더에 같이 붙은 `<Html>` 은 페이지를 나갔다 오면 DOM 에 안 붙고 끝나는
    // 경우가 있었음(다른 사람 명찰처럼 프레임이 돈 뒤 붙이면 안 생김). 그래서
    // 첫 프레임 뒤에 마운트함.
    if (!isSelfReady) {
      setIsSelfReady(true);
    }

    selfGroupRef.current?.position.set(
      viewer.x,
      viewer.y + resolveNameplateLiftY(selfModelIndex),
      viewer.z,
    );

    // 렌더 시계(`clock.elapsedTime`)로 재면 안 됨. 탭을 가렸다 돌아오면 렌더 루프를 다시 켜면서
    // 그 시계가 0 으로 돌아가는데, 마지막 선별 시각은 옛 값으로 남아서 그만큼(머문 시간만큼)
    // 선별이 멈춤. 그동안 새로 들어온 사람은 명찰이 안 뜸.
    const nowMs = performance.now();

    if (nowMs - lastSelectedAtRef.current >= SELECTION_INTERVAL_MS) {
      lastSelectedAtRef.current = nowMs;
      selectVisibleSeats(viewer);
    }

    applySlotPositions();
  }, SPACE_FRAME_PRIORITY.overlay);
  // endregion

  return (
    <>
      {/* 이름이 비면 글자 없는 검은 알약만 뜬다. 그릴 것이 없으면 그리지 않는다. */}
      {isSelfReady && selfNickname !== "" && (
        <group ref={attachSelfGroup}>
          <Html center distanceFactor={nameplateDistanceFactor} zIndexRange={[20, 0]}>
            <span className="flex h-5 w-max select-none items-center whitespace-nowrap rounded-full bg-black/65 px-2 text-[11px] font-medium leading-none text-white/90 backdrop-blur-sm">
              {selfNickname}
            </span>
          </Html>
        </group>
      )}
      {visiblePlayers.map((player) => (
        <group
          key={player.seat}
          ref={(group) => {
            attachRemoteGroup(player, group);
          }}
        >
          <Html center distanceFactor={nameplateDistanceFactor} zIndexRange={[20, 0]}>
            <span className="flex h-5 w-max select-none items-center whitespace-nowrap rounded-full bg-black/65 px-2 text-[11px] font-medium leading-none text-white/90 backdrop-blur-sm">
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
