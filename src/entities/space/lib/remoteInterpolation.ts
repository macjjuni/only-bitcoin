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

/** `serverTime` 은 uint32 를 풀어 이은 서버 시계(ms). */
interface TimedMotion {
  serverTime: number;
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

/** 지연 버퍼 하한. 송신 박자가 틱 하나를 건너뛰어도(200 ms 공백) 끊기지 않게 2칸 잡음. */
export const SPACE_MIN_RENDER_DELAY_MS = SPACE_NETWORK_INTERVAL_MS * 2;
/** 지연 버퍼 상한. 이보다 늦은 패킷은 외삽으로 버팀. */
export const SPACE_MAX_RENDER_DELAY_MS = SPACE_NETWORK_INTERVAL_MS * 3;
/** 같은 좌석 표본 간격이 이보다 길면 쉬다 출발한 것으로 봄. */
const IDLE_GAP_MS = SPACE_NETWORK_INTERVAL_MS * 2.5;
/** 외삽 상한. 지수 감속이라 이 시간만큼 간 거리에 점근함. */
const MAX_EXTRAPOLATION_MS = 120;
/** 시계 오프셋 추정을 위로 풀어 주는 속도. 경로가 느려져도 따라감. */
const OFFSET_DRIFT_PER_MS = 0.01;
const JITTER_RISE_RATE = 0.5;
const JITTER_DECAY_RATE = 0.05;
/** 한 번 튄 지연이 지터 추정을 망치지 않게 자름. */
const MAX_LATENESS_MS = 1_000;
/** 재생 시각을 고치는 속도. 5% 이내라 빨라지거나 느려진 게 눈에 안 띔. */
const PLAYBACK_SLEW_RATE = 0.05;
/** 이보다 크게 어긋나면 서서히 맞추지 않고 바로 맞춤. */
const PLAYBACK_SNAP_MS = 500;

const normalizeYaw = (yaw: number): number => ((yaw % FULL_TURN) + FULL_TURN) % FULL_TURN;

const interpolateYaw = (fromYaw: number, toYaw: number, progress: number): number => {
  const shortestDelta = normalizeYaw(toYaw - fromYaw + Math.PI) - Math.PI;
  return normalizeYaw(fromYaw + shortestDelta * progress);
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * 원격 아바타 보간기.
 *
 * 도착 시각이 아니라 **서버 타임스탬프**를 시간축으로 씀. 모바일은 도착 간격이 크게
 * 흔들려서 도착 시각 기준이면 몰려 온 패킷에 튀고 늦은 패킷에 멈췄음.
 * - 시계 오프셋: 가장 빨리 온 패킷 기준(`receivedAt - serverTime` 최솟값)으로 잡음.
 * - 지터: 오프셋보다 늦게 온 만큼을 빠르게 올리고 천천히 내림.
 * - 재생 지연: 2칸 + 지터, 200~300 ms. 오프셋·지연이 바뀌면 재생 속도 5% 안에서 서서히 맞춤.
 * - 외삽: 전체 스트림이 멈췄을 때만 최대 120 ms 감속 외삽. 다른 좌석 틱은 오는데 이 좌석만
 *   빠졌으면 멈춘 것이라 외삽 안 함.
 *
 * `receivedAt`·`now` 는 같은 performance.now() 시간축이어야 함.
 */
export const createSpaceInterpolator = (): SpaceInterpolator => {
  const peersBySeat = new Map<number, SpacePeer>();
  const historyBySeat = new Map<number, TimedMotion[]>();
  let renderedPlayers: SpacePeer[] = [];
  let lastTimestamp: number | null = null;
  let latestServerTime = 0;
  let lastReceivedAt = Number.NEGATIVE_INFINITY;
  /** 로컬 시각 = 서버 시각 + offset 이 되는 가장 이른 경로 추정치. */
  let clockOffset = 0;
  let jitter = 0;
  /** 재생 시각 = now - playbackOffset. 오프셋 + 목표 지연을 서서히 따라감. */
  let playbackOffset: number | null = null;
  let lastSampledAt: number | null = null;
  let lastRenderTime = Number.NEGATIVE_INFINITY;

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

  const resolveTargetDelay = (): number =>
    clamp(
      SPACE_NETWORK_INTERVAL_MS * 2 + jitter,
      SPACE_MIN_RENDER_DELAY_MS,
      SPACE_MAX_RENDER_DELAY_MS,
    );

  /** 첫 패킷이면 그대로 쓰고, 이후엔 빠른 패킷으로만 내리고 천천히 풀어 줌. */
  const updateClock = (serverTime: number, receivedAt: number, isFirst: boolean): void => {
    const sampleOffset = receivedAt - serverTime;

    if (isFirst) {
      clockOffset = sampleOffset;
      jitter = 0;
      return;
    }

    const elapsed = Math.max(0, receivedAt - lastReceivedAt);
    clockOffset = Math.min(sampleOffset, clockOffset + elapsed * OFFSET_DRIFT_PER_MS);

    const lateness = Math.min(MAX_LATENESS_MS, sampleOffset - clockOffset);
    const rate = lateness > jitter ? JITTER_RISE_RATE : JITTER_DECAY_RATE;
    jitter += (lateness - jitter) * rate;
  };

  /** 재생 시각(서버 시계). 거꾸로 가지 않게 막음. */
  const resolveRenderTime = (now: number): number => {
    const target = clockOffset + resolveTargetDelay();

    if (
      playbackOffset === null ||
      lastSampledAt === null ||
      Math.abs(target - playbackOffset) > PLAYBACK_SNAP_MS
    ) {
      playbackOffset = target;
    } else {
      const maxStep = Math.max(0, now - lastSampledAt) * PLAYBACK_SLEW_RATE;
      playbackOffset += clamp(target - playbackOffset, -maxStep, maxStep);
    }
    lastSampledAt = now;

    const renderTime = Math.max(lastRenderTime, now - playbackOffset);
    lastRenderTime = renderTime;
    return renderTime;
  };

  /** 마지막 두 표본의 속도로 밀되 지수 감속해 `MAX_EXTRAPOLATION_MS` 거리에 점근함. */
  const extrapolate = (
    player: SpacePeer,
    previous: TimedMotion,
    last: TimedMotion,
    overshoot: number,
  ): void => {
    const span = last.serverTime - previous.serverTime;
    const reach = MAX_EXTRAPOLATION_MS * (1 - Math.exp(-overshoot / MAX_EXTRAPOLATION_MS));
    const scale = span > 0 ? reach / span : 0;

    applyMotion(player, last.motion);
    player.x += (last.motion.x - previous.motion.x) * scale;
    player.y = Math.max(0, player.y + (last.motion.y - previous.motion.y) * scale);
    player.z += (last.motion.z - previous.motion.z) * scale;
  };

  const samplePlayer = (player: SpacePeer, renderTime: number): void => {
    const history = historyBySeat.get(player.seat);

    if (!history || history.length === 0) {
      return;
    }

    // 지난 구간은 버리되 외삽용으로 양끝 표본은 남김.
    while (history.length > 2 && history[1].serverTime <= renderTime) {
      history.shift();
    }

    const first = history[0];
    const last = history[history.length - 1];

    if (renderTime <= first.serverTime) {
      applyMotion(player, first.motion);
      return;
    }
    if (renderTime >= last.serverTime) {
      // 이 좌석보다 새 틱이 이미 왔으면 멈춘 것. 스트림 전체가 끊겼을 때만 외삽함.
      if (history.length >= 2 && latestServerTime <= last.serverTime) {
        extrapolate(player, history[history.length - 2], last, renderTime - last.serverTime);
      } else {
        applyMotion(player, last.motion);
      }
      return;
    }

    const nextIndex = history.findIndex((entry) => entry.serverTime >= renderTime);
    const previous = history[nextIndex - 1];
    const next = history[nextIndex];
    const progress = (renderTime - previous.serverTime) / (next.serverTime - previous.serverTime);
    player.x = previous.motion.x + (next.motion.x - previous.motion.x) * progress;
    // 점프 궤적도 같이 섞음. 100 ms 간격이라 정점이 조금 깎임.
    player.y = previous.motion.y + (next.motion.y - previous.motion.y) * progress;
    player.z = previous.motion.z + (next.motion.z - previous.motion.z) * progress;
    player.yaw = interpolateYaw(previous.motion.yaw, next.motion.yaw, progress);
    player.isRunning = previous.motion.isRunning;
  };

  const pushMotion = (motion: SpaceMotion, serverTime: number): void => {
    const peer = peersBySeat.get(motion.seat);
    if (!peer) {
      return;
    }

    const history: TimedMotion[] = historyBySeat.get(motion.seat) ?? [
      { serverTime: serverTime - SPACE_NETWORK_INTERVAL_MS, motion: { ...peer } },
    ];
    const previousEntry = history[history.length - 1];
    if (serverTime - previousEntry.serverTime > IDLE_GAP_MS) {
      // 쉬다 출발함. 긴 공백 전체를 이동으로 늘리지 않고 마지막 한 칸에서 출발시킴.
      history.push({
        serverTime: serverTime - SPACE_NETWORK_INTERVAL_MS,
        motion: previousEntry.motion,
      });
    }
    const entry = { serverTime, motion: { ...motion } };
    if (history[history.length - 1].serverTime === serverTime) {
      history[history.length - 1] = entry;
    } else {
      history.push(entry);
    }
    while (history.length > MAX_HISTORY_LENGTH) {
      history.shift();
    }
    historyBySeat.set(motion.seat, history);
  };
  // endregion

  // region [Public API]
  const clear = (): void => {
    peersBySeat.clear();
    historyBySeat.clear();
    renderedPlayers = [];
    lastTimestamp = null;
    latestServerTime = 0;
    lastReceivedAt = Number.NEGATIVE_INFINITY;
    clockOffset = 0;
    jitter = 0;
    playbackOffset = null;
    lastSampledAt = null;
    lastRenderTime = Number.NEGATIVE_INFINITY;
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

    const isFirst = lastTimestamp === null;
    let serverTime = snapshot.timestamp;
    if (lastTimestamp !== null) {
      // uint32 ms 시계가 약 49.7일마다 돌아도 새 표본과 지연 패킷을 구분함.
      const elapsedTimestamp =
        (snapshot.timestamp - lastTimestamp + TIMESTAMP_RANGE) % TIMESTAMP_RANGE;
      if (elapsedTimestamp >= TIMESTAMP_RANGE / 2) {
        return;
      }
      serverTime = latestServerTime + elapsedTimestamp;
    }

    updateClock(serverTime, receivedAt, isFirst);
    lastTimestamp = snapshot.timestamp;
    latestServerTime = serverTime;
    lastReceivedAt = receivedAt;

    for (const motion of snapshot.players) {
      pushMotion(motion, serverTime);
    }
  };

  const sample = (now: number): RemotePlayer[] => {
    if (Number.isFinite(now) && lastTimestamp !== null) {
      const renderTime = resolveRenderTime(now);
      for (const player of renderedPlayers) {
        samplePlayer(player, renderTime);
      }
    }

    return renderedPlayers;
  };
  // endregion

  return { setPeers, upsertPeer, removePeer, pushSnapshot, sample, clear };
};
