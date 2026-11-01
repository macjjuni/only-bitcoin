import type { RemotePlayer } from "../model/playerState";
import {
  isSpacePeer,
  SPACE_NETWORK_INTERVAL_MS,
  type SpaceMotion,
  type SpaceMotionSnapshot,
  type SpacePeer,
} from "../model/spaceProtocol";
import { SPACE_MAX_OCCUPANTS } from "../model/spaceWorld";
import { isValidSpaceSnapshot } from "./spaceSnapshot";

interface ReceivedMotion {
  receivedAt: number;
  motion: SpaceMotion;
}

export interface SpaceInterpolator {
  setPeers: (peers: readonly SpacePeer[]) => void;
  upsertPeer: (peer: SpacePeer) => void;
  removePeer: (seat: number) => void;
  pushSnapshot: (snapshot: SpaceMotionSnapshot, receivedAt: number) => void;
  sample: (now: number) => RemotePlayer[];
  clear: () => void;
}

const FULL_TURN = Math.PI * 2;
const TIMESTAMP_RANGE = 0x1_0000_0000;
const MAX_HISTORY_LENGTH = 32;

const normalizeYaw = (yaw: number): number => ((yaw % FULL_TURN) + FULL_TURN) % FULL_TURN;

const interpolateYaw = (fromYaw: number, toYaw: number, progress: number): number => {
  const shortestDelta = normalizeYaw(toYaw - fromYaw + Math.PI) - Math.PI;
  return normalizeYaw(fromYaw + shortestDelta * progress);
};

/** 수신 시각과 sample 시각은 모두 같은 performance.now() 시간축을 사용한다. */
export const createSpaceInterpolator = (): SpaceInterpolator => {
  const peersBySeat = new Map<number, SpacePeer>();
  const historyBySeat = new Map<number, ReceivedMotion[]>();
  let renderedPlayers: SpacePeer[] = [];
  let lastTimestamp: number | null = null;
  let lastReceivedAt = Number.NEGATIVE_INFINITY;

  // region [Privates]
  const rebuildRoster = (): void => {
    renderedPlayers = [...peersBySeat.values()].sort((first, second) => first.seat - second.seat);
  };

  const applyPeer = (peer: SpacePeer): void => {
    const currentPeer = peersBySeat.get(peer.seat);

    if (currentPeer) {
      Object.assign(currentPeer, peer);
    } else {
      peersBySeat.set(peer.seat, { ...peer });
      rebuildRoster();
    }

    historyBySeat.delete(peer.seat);
  };

  const applyMotion = (player: SpacePeer, motion: SpaceMotion): void => {
    player.x = motion.x;
    player.y = motion.y;
    player.z = motion.z;
    player.yaw = motion.yaw;
    player.isRunning = motion.isRunning;
  };

  const samplePlayer = (player: SpacePeer, targetTime: number): void => {
    const history = historyBySeat.get(player.seat);

    if (!history || history.length === 0) {
      return;
    }

    // 이미 지난 구간은 버리되 양끝 표본은 유지한다. 멈춘 좌석에는 외삽하지 않는다.
    while (history.length > 2 && history[1].receivedAt <= targetTime) {
      history.shift();
    }

    const first = history[0];
    const last = history[history.length - 1];

    if (targetTime <= first.receivedAt) {
      applyMotion(player, first.motion);
      return;
    }
    if (targetTime >= last.receivedAt) {
      applyMotion(player, last.motion);
      return;
    }

    const nextIndex = history.findIndex((entry) => entry.receivedAt >= targetTime);
    const previous = history[nextIndex - 1];
    const next = history[nextIndex];
    const progress = (targetTime - previous.receivedAt) / (next.receivedAt - previous.receivedAt);
    player.x = previous.motion.x + (next.motion.x - previous.motion.x) * progress;
    // 점프 궤적도 같은 방식으로 섞는다. 100 ms 간격이라 정점이 조금 깎인다.
    player.y = previous.motion.y + (next.motion.y - previous.motion.y) * progress;
    player.z = previous.motion.z + (next.motion.z - previous.motion.z) * progress;
    player.yaw = interpolateYaw(previous.motion.yaw, next.motion.yaw, progress);
    player.isRunning = previous.motion.isRunning;
  };
  // endregion

  // region [Public API]
  const clear = (): void => {
    peersBySeat.clear();
    historyBySeat.clear();
    renderedPlayers = [];
    lastTimestamp = null;
    lastReceivedAt = Number.NEGATIVE_INFINITY;
  };

  const setPeers = (peers: readonly SpacePeer[]): void => {
    if (
      peers.length > SPACE_MAX_OCCUPANTS ||
      !peers.every(isSpacePeer) ||
      new Set(peers.map((peer) => peer.seat)).size !== peers.length
    ) {
      throw new RangeError("공간 참가자 명단이 올바르지 않습니다.");
    }

    clear();
    for (const peer of peers) {
      peersBySeat.set(peer.seat, { ...peer });
    }
    rebuildRoster();
  };

  const upsertPeer = (peer: SpacePeer): void => {
    if (!isSpacePeer(peer)) {
      throw new RangeError("공간 참가자 정보가 올바르지 않습니다.");
    }

    applyPeer(peer);
  };

  const removePeer = (seat: number): void => {
    if (peersBySeat.delete(seat)) {
      historyBySeat.delete(seat);
      rebuildRoster();
    }
  };

  const pushSnapshot = (snapshot: SpaceMotionSnapshot, receivedAt: number): void => {
    if (
      !isValidSpaceSnapshot(snapshot) ||
      !Number.isFinite(receivedAt) ||
      receivedAt < lastReceivedAt
    ) {
      return;
    }

    if (lastTimestamp !== null) {
      // uint32 밀리초 시계가 약 49.7일마다 돌아도 새 표본과 지연 패킷을 구분한다.
      const elapsedTimestamp =
        (snapshot.timestamp - lastTimestamp + TIMESTAMP_RANGE) % TIMESTAMP_RANGE;
      if (elapsedTimestamp >= TIMESTAMP_RANGE / 2) {
        return;
      }
    }

    lastTimestamp = snapshot.timestamp;
    lastReceivedAt = receivedAt;

    for (const motion of snapshot.players) {
      const peer = peersBySeat.get(motion.seat);
      if (!peer) {
        continue;
      }

      const history: ReceivedMotion[] = historyBySeat.get(motion.seat) ?? [
        {
          receivedAt: receivedAt - SPACE_NETWORK_INTERVAL_MS,
          motion: { ...peer },
        },
      ];
      const previousEntry = history[history.length - 1];
      const transitionStart = receivedAt - SPACE_NETWORK_INTERVAL_MS;
      if (previousEntry.receivedAt < transitionStart) {
        // 유휴 시간에는 패킷이 없다. 긴 공백 전체를 이동 구간으로 보간하지 않는다.
        history.push({ receivedAt: transitionStart, motion: previousEntry.motion });
      }
      const entry = { receivedAt, motion: { ...motion } };
      if (history[history.length - 1].receivedAt === receivedAt) {
        history[history.length - 1] = entry;
      } else {
        history.push(entry);
      }
      while (history.length > MAX_HISTORY_LENGTH) {
        history.shift();
      }
      historyBySeat.set(motion.seat, history);
    }
  };

  const sample = (now: number): RemotePlayer[] => {
    if (Number.isFinite(now)) {
      const targetTime = now - SPACE_NETWORK_INTERVAL_MS;
      for (const player of renderedPlayers) {
        samplePlayer(player, targetTime);
      }
    }

    return renderedPlayers;
  };
  // endregion

  return { setPeers, upsertPeer, removePeer, pushSnapshot, sample, clear };
};
