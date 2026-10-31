import { v4 as createUuid } from "uuid";
import {
  createOfflinePresence,
  createSpaceInterpolator,
  decodeSpaceSnapshot,
  type LocalPlayerState,
  parseSpaceServerFrame,
  type RemotePlayer,
  type SpaceChatMessage,
  type SpacePeer,
  type SpacePresence,
  type SpaceServerFrame,
} from "@/entities/space";

export interface SpaceSessionIdentity {
  clientKey: string;
  nickname: string;
}

export interface SpaceSessionSnapshot {
  presence: SpacePresence;
  messages: SpaceChatMessage[];
  bubbleMessages: SpaceChatMessage[];
  error: string | null;
  self: SpacePeer | null;
  remotePlayers: RemotePlayer[];
  rosterRevision: number;
  isMessagePending: boolean;
}

export interface SpaceSessionSocket {
  readonly readyState: number;
  readonly bufferedAmount: number;
  binaryType: BinaryType;
  addEventListener(type: string, listener: EventListener): void;
  send(payload: string): void;
  close(code?: number, reason?: string): void;
}

interface SpaceSessionControllerOptions {
  identity: SpaceSessionIdentity;
  webSocketUrl: string;
  createSocket?: (url: string) => SpaceSessionSocket;
  now?: () => number;
  random?: () => number;
  createRequestId?: () => string;
}

interface MovementFrame {
  x: number;
  z: number;
  yaw: number;
  isRunning: boolean;
}

interface PendingMessage {
  requestId: string;
  resolve: (hasSucceeded: boolean) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const socketOpenState = 1;
const socketClosingState = 2;
const movementIntervalMs = 100;
const heartbeatIntervalMs = 15_000;
const heartbeatTimeoutMs = 45_000;
const connectionTimeoutMs = 10_000;
const messageTimeoutMs = 10_000;
const maximumBufferedBytes = 16_384;
const maximumMessageCount = 100;
const fullTurn = Math.PI * 2;
const yawSteps = 256;
const permanentErrorCodes = new Set([
  "SESSION_REPLACED",
  "INVALID_PROTOCOL",
  "UNSUPPORTED_VERSION",
  "INVALID_VERSION",
  "INVALID_FRAME",
  "INVALID_JOIN",
  "INVALID_NICKNAME",
  "INVALID_CLIENT_KEY",
]);
const permanentCloseCodes = new Set([1002, 1003, 1008, 4001]);

const hasSameMovement = (first: MovementFrame | null, second: MovementFrame): boolean => {
  return (
    first !== null &&
    first.x === second.x &&
    first.z === second.z &&
    first.yaw === second.yaw &&
    first.isRunning === second.isRunning
  );
};

/** 서버 스냅샷과 같은 cm·8비트 방향으로 접어 미세한 부동소수점 흔들림을 보내지 않는다. */
const quantizeMovement = (state: MovementFrame): MovementFrame => {
  const normalizedYaw = ((state.yaw % fullTurn) + fullTurn) % fullTurn;
  const yawStep = Math.round((normalizedYaw / fullTurn) * yawSteps) % yawSteps;

  return {
    x: Math.round(state.x * 100) / 100,
    z: Math.round(state.z * 100) / 100,
    yaw: (yawStep / yawSteps) * fullTurn,
    isRunning: state.isRunning,
  };
};

/**
 * 소켓과 타이머를 소유하며 위치 프레임은 React 상태 밖에서 처리한다.
 *
 * roster가 바뀔 때만 원격 배열을 교체하고, 프레임별 보간은 같은 배열의 좌표를 갱신한다.
 * 세대 번호로 이전 연결의 지연 이벤트를 무시해 재연결 뒤 상태가 되돌아가지 않게 한다.
 */
export class SpaceSessionController {
  private readonly options: Required<SpaceSessionControllerOptions>;
  private readonly interpolator = createSpaceInterpolator();
  private readonly listeners = new Set<() => void>();
  private readonly peers = new Map<number, SpacePeer>();
  private socket: SpaceSessionSocket | null = null;
  private generation = 0;
  private isStarted = false;
  private isVisible = true;
  private isOnline = true;
  private isRetryStopped = false;
  private retryAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pendingMessage: PendingMessage | null = null;
  private latestMovement: MovementFrame | null = null;
  private lastSentMovement: MovementFrame | null = null;
  private lastMovementSentAt = Number.NEGATIVE_INFINITY;
  private lastReceivedAt = 0;
  private snapshot: SpaceSessionSnapshot = {
    presence: createOfflinePresence(),
    messages: [],
    bubbleMessages: [],
    error: null,
    self: null,
    remotePlayers: [],
    rosterRevision: 0,
    isMessagePending: false,
  };

  constructor(options: SpaceSessionControllerOptions) {
    this.options = {
      ...options,
      createSocket: options.createSocket ?? ((url) => new WebSocket(url)),
      now: options.now ?? (() => performance.now()),
      random: options.random ?? Math.random,
      createRequestId: options.createRequestId ?? createUuid,
    };
  }

  getSnapshot = (): SpaceSessionSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start(): void {
    if (this.isStarted) {
      return;
    }

    this.isStarted = true;
    this.isRetryStopped = false;
    this.connect();
  }

  stop(): void {
    this.isStarted = false;
    this.clearReconnectTimer();
    this.detachSocket();
    this.clearRoster();
    this.updateSnapshot({ presence: createOfflinePresence(), self: null });
  }

  retry = (): void => {
    this.isRetryStopped = false;
    this.retryAttempt = 0;
    this.clearReconnectTimer();
    this.detachSocket();
    this.clearRoster();
    this.connect();
  };

  setVisibility(isVisible: boolean): void {
    this.isVisible = isVisible;

    if (!isVisible) {
      this.clearReconnectTimer();
      return;
    }

    if (this.socket && this.options.now() - this.lastReceivedAt > heartbeatTimeoutMs) {
      this.handleDisconnected("연결이 지연되어 다시 접속합니다.");
      return;
    }

    this.connect();
    this.flushMovement();
  }

  setOnline(isOnline: boolean): void {
    this.isOnline = isOnline;

    if (!isOnline) {
      this.clearReconnectTimer();
      this.detachSocket();
      this.clearRoster();
      this.updateSnapshot({ presence: createOfflinePresence(), self: null });
      return;
    }

    this.connect();
  }

  publishMovement = (state: LocalPlayerState): void => {
    if (![state.x, state.z, state.yaw].every(Number.isFinite)) {
      return;
    }

    this.latestMovement = quantizeMovement(state);
    this.flushMovement();
  };

  sampleRemotePlayers = (now: number): RemotePlayer[] => {
    return this.interpolator.sample(now);
  };

  sendMessage = (body: string): Promise<boolean> => {
    const trimmedBody = body.trim();

    if (!trimmedBody || this.pendingMessage || this.snapshot.presence.status !== "online") {
      return Promise.resolve(false);
    }

    const requestId = this.options.createRequestId();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.finishPendingMessage(false);
        this.updateSnapshot({ error: "메시지 전송 확인 시간이 초과됐어요. 다시 시도해 주세요." });
      }, messageTimeoutMs);
      this.pendingMessage = { requestId, resolve, timeout };
      this.updateSnapshot({ isMessagePending: true, error: null });

      if (!this.sendFrame({ v: 1, t: "say", rid: requestId, body: trimmedBody })) {
        this.finishPendingMessage(false);
        this.updateSnapshot({ error: "메시지를 전송하지 못했어요. 연결을 확인해 주세요." });
      }
    });
  };

  private updateSnapshot(changes: Partial<SpaceSessionSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...changes };
    this.listeners.forEach((listener) => {
      listener();
    });
  }

  private canConnect(): boolean {
    return this.isStarted && this.isOnline && this.isVisible && !this.isRetryStopped;
  }

  private connect(): void {
    if (!this.canConnect() || this.socket || this.reconnectTimer) {
      return;
    }

    if (!this.options.webSocketUrl) {
      this.updateSnapshot({
        presence: createOfflinePresence(),
        error: "스페이스 접속 서버가 아직 설정되지 않았어요.",
      });
      return;
    }

    this.updateSnapshot({ presence: { status: "connecting", occupantCount: 0 }, error: null });
    const generation = ++this.generation;
    let socket: SpaceSessionSocket;

    try {
      socket = this.options.createSocket(this.options.webSocketUrl);
    } catch {
      this.handleDisconnected("스페이스에 연결하지 못했어요. 다시 접속합니다.");
      return;
    }

    socket.binaryType = "arraybuffer";
    this.socket = socket;
    this.lastReceivedAt = this.options.now();
    this.connectionTimer = setTimeout(() => {
      if (this.isCurrentSocket(socket, generation)) {
        this.handleDisconnected("스페이스 연결 시간이 초과됐어요. 다시 접속합니다.");
      }
    }, connectionTimeoutMs);

    socket.addEventListener("open", () => {
      if (!this.isCurrentSocket(socket, generation)) {
        return;
      }

      this.sendFrame({
        v: 1,
        t: "join",
        clientKey: this.options.identity.clientKey,
        nickname: this.options.identity.nickname,
      });
    });
    socket.addEventListener("message", (event) => {
      if (this.isCurrentSocket(socket, generation)) {
        this.handlePayload((event as MessageEvent<unknown>).data);
      }
    });
    socket.addEventListener("close", (event) => {
      if (!this.isCurrentSocket(socket, generation)) {
        return;
      }

      const closeCode = (event as CloseEvent).code;
      if (permanentCloseCodes.has(closeCode)) {
        this.stopAutomaticRetry(
          closeCode === 4001
            ? "다른 탭에서 스페이스에 접속했어요. 이 탭에서 다시 접속하려면 재시도해 주세요."
            : "스페이스 연결을 유지할 수 없어요. 다시 접속해 주세요.",
        );
        return;
      }

      this.handleDisconnected("스페이스 연결이 끊겼어요. 다시 접속합니다.");
    });
    socket.addEventListener("error", () => {
      if (this.isCurrentSocket(socket, generation)) {
        this.handleDisconnected("스페이스에 연결하지 못했어요. 다시 접속합니다.");
      }
    });
  }

  private isCurrentSocket(socket: SpaceSessionSocket, generation: number): boolean {
    return this.socket === socket && this.generation === generation && this.isStarted;
  }

  private handlePayload(payload: unknown): void {
    this.lastReceivedAt = this.options.now();

    if (payload === "pong") {
      return;
    }

    if (payload instanceof ArrayBuffer) {
      const snapshot = decodeSpaceSnapshot(payload);
      if (!snapshot) {
        this.stopAutomaticRetry("스페이스 데이터 형식이 맞지 않아요. 다시 접속해 주세요.");
        return;
      }

      if (this.snapshot.self) {
        this.interpolator.pushSnapshot(snapshot, this.options.now());
      }
      return;
    }

    const frame = typeof payload === "string" ? parseSpaceServerFrame(payload) : null;
    if (!frame) {
      this.stopAutomaticRetry("스페이스 통신 형식이 맞지 않아요. 새로고침 후 다시 접속해 주세요.");
      return;
    }

    this.applyServerFrame(frame);
  }

  private applyServerFrame(frame: SpaceServerFrame): void {
    switch (frame.t) {
      case "welcome": {
        this.clearConnectionTimer();
        this.retryAttempt = 0;
        this.peers.clear();
        const peers = frame.peers.filter((peer) => peer.seat !== frame.self.seat);
        peers.forEach((peer) => {
          this.peers.set(peer.seat, peer);
        });
        this.interpolator.setPeers(peers);
        this.setAuthoritativeMovement(frame.self);
        this.updateSnapshot({
          self: frame.self,
          presence: { status: "online", occupantCount: this.peers.size + 1 },
          error: null,
          remotePlayers: this.interpolator.sample(this.options.now()),
          bubbleMessages: [],
          rosterRevision: this.snapshot.rosterRevision + 1,
        });
        this.startHeartbeat();
        return;
      }
      case "peer": {
        if (!this.snapshot.self) {
          return;
        }
        if (frame.peer.seat === this.snapshot.self.seat) {
          this.setAuthoritativeMovement(frame.peer);
          this.updateSnapshot({
            self: frame.peer,
            bubbleMessages: this.snapshot.bubbleMessages.filter(
              (message) => message.seat !== frame.peer.seat,
            ),
          });
          return;
        }

        this.peers.set(frame.peer.seat, frame.peer);
        this.interpolator.upsertPeer(frame.peer);
        this.publishRoster(frame.peer.seat);
        return;
      }
      case "leave": {
        this.peers.delete(frame.seat);
        this.interpolator.removePeer(frame.seat);
        this.publishRoster(frame.seat);
        return;
      }
      case "say": {
        const hasMessage = this.snapshot.messages.some(
          (message) => message.id === frame.message.id,
        );
        if (!hasMessage) {
          this.updateSnapshot({
            messages: [...this.snapshot.messages, frame.message].slice(-maximumMessageCount),
            bubbleMessages: [...this.snapshot.bubbleMessages, frame.message].slice(
              -maximumMessageCount,
            ),
          });
        }
        if (
          this.pendingMessage?.requestId === frame.message.rid &&
          this.snapshot.self?.seat === frame.message.seat
        ) {
          this.finishPendingMessage(true);
        }
        return;
      }
      case "error": {
        if (permanentErrorCodes.has(frame.code)) {
          this.stopAutomaticRetry(frame.message);
          return;
        }
        if (
          this.snapshot.presence.status === "connecting" ||
          frame.code === "JOIN_REQUIRED" ||
          frame.code === "UNAVAILABLE"
        ) {
          this.handleDisconnected(frame.message);
          return;
        }
        if (frame.rid && this.pendingMessage?.requestId === frame.rid) {
          this.finishPendingMessage(false);
        }
        this.updateSnapshot({ error: frame.message });
        return;
      }
      case "full": {
        this.stopAutomaticRetry("공간이 가득 찼습니다. 잠시 후 다시 접속해 주세요.");
        return;
      }
      default: {
        const unreachableFrame: never = frame;
        throw new Error(`지원하지 않는 공간 프레임: ${String(unreachableFrame)}`);
      }
    }
  }

  private setAuthoritativeMovement(peer: SpacePeer): void {
    this.latestMovement = quantizeMovement(peer);
    this.lastSentMovement = this.latestMovement;
    this.lastMovementSentAt = Number.NEGATIVE_INFINITY;
  }

  private publishRoster(changedSeat: number): void {
    this.updateSnapshot({
      remotePlayers: this.interpolator.sample(this.options.now()),
      bubbleMessages: this.snapshot.bubbleMessages.filter(
        (message) => message.seat !== changedSeat,
      ),
      rosterRevision: this.snapshot.rosterRevision + 1,
      presence: {
        status: this.snapshot.presence.status,
        occupantCount: this.snapshot.self ? this.peers.size + 1 : 0,
      },
    });
  }

  private clearRoster(): void {
    this.peers.clear();
    this.interpolator.clear();
    this.latestMovement = null;
    this.lastSentMovement = null;
    this.updateSnapshot({
      remotePlayers: this.interpolator.sample(this.options.now()),
      bubbleMessages: [],
      rosterRevision: this.snapshot.rosterRevision + 1,
    });
  }

  private flushMovement(): void {
    const movement = this.latestMovement;
    const now = this.options.now();

    if (
      !movement ||
      !this.isVisible ||
      this.snapshot.presence.status !== "online" ||
      now - this.lastMovementSentAt < movementIntervalMs ||
      hasSameMovement(this.lastSentMovement, movement) ||
      (this.socket?.bufferedAmount ?? 0) > maximumBufferedBytes
    ) {
      return;
    }

    if (this.sendFrame({ v: 1, t: "move", ...movement })) {
      this.lastSentMovement = { ...movement };
      this.lastMovementSentAt = now;
    }
  }

  private sendFrame(frame: object): boolean {
    if (this.socket?.readyState !== socketOpenState) {
      return false;
    }

    try {
      this.socket.send(JSON.stringify(frame));
      return true;
    } catch {
      this.handleDisconnected("스페이스 연결이 끊겼어요. 다시 접속합니다.");
      return false;
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.options.now() - this.lastReceivedAt > heartbeatTimeoutMs) {
        this.handleDisconnected("스페이스 응답이 없어 다시 접속합니다.");
        return;
      }

      if (this.socket?.readyState === socketOpenState) {
        try {
          this.socket.send("ping");
        } catch {
          this.handleDisconnected("스페이스 연결이 끊겼어요. 다시 접속합니다.");
        }
      }
    }, heartbeatIntervalMs);
  }

  private finishPendingMessage(hasSucceeded: boolean): void {
    const pending = this.pendingMessage;
    if (!pending) {
      return;
    }

    this.pendingMessage = null;
    clearTimeout(pending.timeout);
    this.updateSnapshot({ isMessagePending: false });
    pending.resolve(hasSucceeded);
  }

  private handleDisconnected(error: string): void {
    this.detachSocket();
    this.clearRoster();
    this.updateSnapshot({ presence: createOfflinePresence(), self: null, error });
    this.scheduleReconnect();
  }

  private stopAutomaticRetry(error: string): void {
    this.isRetryStopped = true;
    this.clearReconnectTimer();
    this.detachSocket();
    this.clearRoster();
    this.updateSnapshot({ presence: createOfflinePresence(), self: null, error });
  }

  private scheduleReconnect(): void {
    if (!this.canConnect() || this.reconnectTimer) {
      return;
    }

    const exponent = Math.min(this.retryAttempt, 5);
    const baseDelayMs = Math.min(1_000 * 2 ** exponent, 30_000);
    const randomValue = Math.min(Math.max(this.options.random(), 0), 1);
    const delayMs = Math.min(Math.round(baseDelayMs * (0.75 + randomValue * 0.5)), 30_000);
    this.retryAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delayMs);
  }

  private detachSocket(): void {
    const socket = this.socket;
    this.socket = null;
    this.generation += 1;
    this.clearConnectionTimer();
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.finishPendingMessage(false);

    if (socket && socket.readyState < socketClosingState) {
      socket.close(1000, "space session closed");
    }
  }

  private clearConnectionTimer(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
