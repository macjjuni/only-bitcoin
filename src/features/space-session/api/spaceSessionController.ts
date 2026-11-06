import { v4 as createUuid } from "uuid";
import {
  createOfflinePresence,
  createSpaceInterpolator,
  decodeSpaceSnapshot,
  type LocalPlayerState,
  parseSpaceServerFrame,
  type RemotePlayer,
  SPACE_PROTOCOL_VERSION,
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
  isNicknamePending: boolean;
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
  /** 입장할 때 보낼 아바타 모델. 저장소에서 읽은 값을 그대로 받음. */
  modelIndex: number;
  webSocketUrl: string;
  createSocket?: (url: string) => SpaceSessionSocket;
  now?: () => number;
  random?: () => number;
  createRequestId?: () => string;
}

interface MovementFrame {
  x: number;
  y: number;
  z: number;
  yaw: number;
  isRunning: boolean;
}

interface PendingMessage {
  requestId: string;
  resolve: (hasSucceeded: boolean) => void;
  timeout: ReturnType<typeof setTimeout>;
}

interface PendingNickname extends PendingMessage {
  nickname: string;
}

interface PendingModel extends PendingMessage {
  modelIndex: number;
}

const socketOpenState = 1;
const socketClosingState = 2;
const movementIntervalMs = 100;
/**
 * 송신 박자 여유. 30 fps 면 프레임이 100 ms 에 딱 안 맞아 133 ms 마다 보내게 됐음.
 * 예정 시각보다 이만큼 이르면 보내고 예정 시각을 누적해 평균 100 ms 로 맞춤.
 */
const movementSendToleranceMs = 8;
const heartbeatIntervalMs = 15_000;
const heartbeatTimeoutMs = 45_000;
const connectionTimeoutMs = 10_000;
const messageTimeoutMs = 10_000;
/**
 * 업그레이드 한도를 넘겼다고 서버가 알려주는 종료 코드.
 *
 * 핸드셰이크 429는 브라우저가 JS 에 숨기므로 Worker 가 101 로 받은 뒤 이 코드로
 * 닫음. 영구 오류 아님. 창이 지나면 다시 들어갈 수 있음.
 */
const rateLimitCloseCode = 4010;
/** 한도를 맞은 뒤 쉬는 시간. 서버 리미터 창(60초)과 같게 둠. */
const rateLimitCooldownMs = 60_000;
/**
 * 수동 재시도의 최소 간격.
 *
 * 재시도 버튼은 백오프를 0으로 되돌리고 바로 올라감. 연타하면 그대로
 * 업그레이드 요청이 되어 IP당 30회/60초 한도를 태우고, 거절된 요청도 창에
 * 쌓여서 눌러 고치려다 장애가 분 단위로 늘어남.
 */
const retryThrottleMs = 5_000;
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

/**
 * 입장 때 받은 기록을 지금 보던 목록에 합침.
 *
 * 재접속이면 이미 본 메시지와 겹침. id 로 중복을 빼고 시간순으로 다시 세운 뒤
 * 최근 100개만 남김.
 */
const mergeChatHistory = (
  currentMessages: readonly SpaceChatMessage[],
  historyMessages: readonly SpaceChatMessage[],
): SpaceChatMessage[] => {
  const messagesById = new Map<string, SpaceChatMessage>();

  for (const message of [...historyMessages, ...currentMessages]) {
    messagesById.set(message.id, message);
  }

  return Array.from(messagesById.values())
    .sort((first, second) => first.createdAt - second.createdAt)
    .slice(-maximumMessageCount);
};

const hasSameMovement = (first: MovementFrame | null, second: MovementFrame): boolean => {
  return (
    first !== null &&
    first.x === second.x &&
    first.y === second.y &&
    first.z === second.z &&
    first.yaw === second.yaw &&
    first.isRunning === second.isRunning
  );
};

/** 서버 스냅샷과 같은 cm·8비트 방향으로 접어 미세한 부동소수점 흔들림은 안 보냄. */
const quantizeMovement = (state: MovementFrame): MovementFrame => {
  const normalizedYaw = ((state.yaw % fullTurn) + fullTurn) % fullTurn;
  const yawStep = Math.round((normalizedYaw / fullTurn) * yawSteps) % yawSteps;

  return {
    x: Math.round(state.x * 100) / 100,
    // 스냅샷이 1 cm 정밀도라 같은 정밀도로 접음.
    y: Math.round(state.y * 100) / 100,
    z: Math.round(state.z * 100) / 100,
    yaw: (yawStep / yawSteps) * fullTurn,
    isRunning: state.isRunning,
  };
};

/**
 * 소켓·타이머를 소유하고 위치 프레임은 React 상태 밖에서 처리함.
 *
 * roster가 바뀔 때만 원격 배열을 교체하고, 프레임별 보간은 같은 배열의 좌표만 갱신함.
 * 세대 번호로 이전 연결의 늦은 이벤트를 무시해 재연결 뒤 상태가 되돌아가지 않게 함.
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
  private pendingNickname: PendingNickname | null = null;
  private pendingModel: PendingModel | null = null;
  private latestMovement: MovementFrame | null = null;
  private lastSentMovement: MovementFrame | null = null;
  private lastMovementSentAt = Number.NEGATIVE_INFINITY;
  private lastRetryAt = Number.NEGATIVE_INFINITY;
  private rateLimitedUntil = 0;
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
    isNicknamePending: false,
  };

  /** 재접속 시 보낼 닉네임. 변경이 확정되면 갱신함. */
  private nickname: string;
  /** 고른 아바타 모델. 재접속할 때 입장 프레임에 다시 실어 보냄. */
  private modelIndex: number;

  constructor(options: SpaceSessionControllerOptions) {
    this.nickname = options.identity.nickname;
    this.modelIndex = options.modelIndex;
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
    const now = this.options.now();

    if (now - this.lastRetryAt < retryThrottleMs) {
      return;
    }
    this.lastRetryAt = now;
    this.isRetryStopped = false;
    this.retryAttempt = 0;
    this.clearReconnectTimer();
    this.detachSocket();
    this.clearRoster();

    // 한도를 맞은 직후면 눌러도 안 올라감. 다시 때리면 창만 길어짐.
    if (now < this.rateLimitedUntil) {
      this.updateSnapshot({
        presence: createOfflinePresence(),
        self: null,
        error: "접속 요청이 많아요. 잠시 뒤 자동으로 다시 연결합니다.",
      });
      this.scheduleReconnect();
      return;
    }

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
    if (![state.x, state.y, state.z, state.yaw].every(Number.isFinite)) {
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

      if (
        !this.sendFrame({ v: SPACE_PROTOCOL_VERSION, t: "say", rid: requestId, body: trimmedBody })
      ) {
        this.finishPendingMessage(false);
        this.updateSnapshot({ error: "메시지를 전송하지 못했어요. 연결을 확인해 주세요." });
      }
    });
  };

  /**
   * 닉네임을 바꿈.
   *
   * 서버가 정규화한 뒤 `peer` 프레임으로 되돌려줘야 성공으로 봄. 길이·금지어
   * 판정은 서버가 해서 여기선 비었는지만 봄.
   */
  changeNickname = (nickname: string): Promise<boolean> => {
    const trimmedNickname = nickname.trim();

    if (
      !trimmedNickname ||
      this.pendingNickname ||
      this.snapshot.presence.status !== "online" ||
      trimmedNickname === this.snapshot.self?.nickname
    ) {
      return Promise.resolve(false);
    }

    const requestId = this.options.createRequestId();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.finishPendingNickname(false);
        this.updateSnapshot({ error: "닉네임 변경 확인 시간이 초과됐어요. 다시 시도해 주세요." });
      }, messageTimeoutMs);
      this.pendingNickname = { requestId, resolve, timeout, nickname: trimmedNickname };
      this.updateSnapshot({ isNicknamePending: true, error: null });

      if (
        !this.sendFrame({
          v: SPACE_PROTOCOL_VERSION,
          t: "nick",
          rid: requestId,
          nickname: trimmedNickname,
        })
      ) {
        this.finishPendingNickname(false);
        this.updateSnapshot({ error: "닉네임을 바꾸지 못했어요. 연결을 확인해 주세요." });
      }
    });
  };

  /**
   * 아바타 모델을 바꿈.
   *
   * 닉네임과 같은 흐름. 서버가 `peer` 프레임으로 되돌려줘야 성공으로 봄.
   * 연결 전이면 보낼 곳이 없어 저장만 하고(호출부 몫) 거짓을 돌려줌.
   */
  changeModel = (modelIndex: number): Promise<boolean> => {
    // 연결 전에도 선택은 유지해야 함. 다음 입장 프레임에 실어 보냄.
    this.modelIndex = modelIndex;

    if (
      this.pendingModel ||
      this.snapshot.presence.status !== "online" ||
      modelIndex === this.snapshot.self?.modelIndex
    ) {
      return Promise.resolve(false);
    }

    const requestId = this.options.createRequestId();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.finishPendingModel(false);
        this.updateSnapshot({ error: "아바타 변경 확인 시간이 초과됐어요. 다시 시도해 주세요." });
      }, messageTimeoutMs);
      this.pendingModel = { requestId, resolve, timeout, modelIndex };
      this.updateSnapshot({ error: null });

      if (!this.sendFrame({ v: SPACE_PROTOCOL_VERSION, t: "model", rid: requestId, modelIndex })) {
        this.finishPendingModel(false);
        this.updateSnapshot({ error: "아바타를 바꾸지 못했어요. 연결을 확인해 주세요." });
      }
    });
  };

  private finishPendingModel(hasSucceeded: boolean): void {
    const pending = this.pendingModel;

    if (!pending) {
      return;
    }

    this.pendingModel = null;
    clearTimeout(pending.timeout);
    pending.resolve(hasSucceeded);
  }

  private finishPendingNickname(hasSucceeded: boolean): void {
    const pending = this.pendingNickname;

    if (!pending) {
      return;
    }

    this.pendingNickname = null;
    clearTimeout(pending.timeout);
    if (hasSucceeded) {
      // 재접속할 때도 바뀐 이름으로 들어가야 함.
      this.nickname = pending.nickname;
    }
    this.updateSnapshot({ isNicknamePending: false });
    pending.resolve(hasSucceeded);
  }

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

    // 탭 복귀처럼 백오프를 안 거치는 경로도 쉬는 시간은 지켜야 함.
    if (this.options.now() < this.rateLimitedUntil) {
      this.scheduleReconnect();
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
        v: SPACE_PROTOCOL_VERSION,
        t: "join",
        clientKey: this.options.identity.clientKey,
        nickname: this.nickname,
        modelIndex: this.modelIndex,
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
      if (closeCode === rateLimitCloseCode) {
        this.rateLimitedUntil = this.options.now() + rateLimitCooldownMs;
        this.handleDisconnected("접속 요청이 많아요. 잠시 뒤 자동으로 다시 연결합니다.");
        return;
      }
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
        this.rateLimitedUntil = 0;
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
          // 기록은 패널에만 넣음. 지난 말이 말풍선으로 다시 뜨면 안 됨.
          messages: mergeChatHistory(this.snapshot.messages, frame.messages ?? []),
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
          // 닉네임만 바뀐 프레임에 위치를 되감으면 캐릭터가 뒤로 튐.
          // 서버가 이동을 거절했을 때만 좌표가 실제로 달라짐.
          if (!hasSameMovement(this.lastSentMovement, quantizeMovement(frame.peer))) {
            this.setAuthoritativeMovement(frame.peer);
          }
          if (this.pendingModel?.modelIndex === frame.peer.modelIndex) {
            this.finishPendingModel(true);
          }
          if (this.pendingNickname?.nickname === frame.peer.nickname) {
            this.finishPendingNickname(true);
          }
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
        // 좌석을 잃었다는 뜻이라 rid 가 붙어 있어도 연결을 다시 세움.
        if (frame.code === "JOIN_REQUIRED") {
          this.handleDisconnected(frame.message);
          return;
        }
        // rid 가 붙은 오류는 한 요청에 대한 답임. 연결을 끊을 이유 없음.
        // 같은 코드라도 입장 때 오면(rid 없음) 영구 오류로 다룸. 예를
        // 들어 닉네임 거절은 입장이면 재시도해도 소용없지만, 이름 변경이면
        // 입력만 고쳐 다시 보내면 됨.
        if (frame.rid) {
          if (this.pendingMessage?.requestId === frame.rid) {
            this.finishPendingMessage(false);
          }
          if (this.pendingNickname?.requestId === frame.rid) {
            this.finishPendingNickname(false);
          }
          if (this.pendingModel?.requestId === frame.rid) {
            this.finishPendingModel(false);
          }
          this.updateSnapshot({ error: frame.message });
          return;
        }
        if (permanentErrorCodes.has(frame.code)) {
          this.stopAutomaticRetry(frame.message);
          return;
        }
        // 입장 중 오류는 연결을 다시 세움.
        if (this.snapshot.presence.status === "connecting") {
          this.handleDisconnected(frame.message);
          return;
        }
        if (frame.code === "UNAVAILABLE") {
          this.handleDisconnected(frame.message);
          return;
        }
        this.updateSnapshot({ error: frame.message });
        return;
      }
      case "full": {
        this.stopAutomaticRetry("지금은 빈자리가 없어요. 잠시 후 다시 접속해 주세요.");
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
      now - this.lastMovementSentAt < movementIntervalMs - movementSendToleranceMs ||
      hasSameMovement(this.lastSentMovement, movement) ||
      (this.socket?.bufferedAmount ?? 0) > maximumBufferedBytes
    ) {
      return;
    }

    if (this.sendFrame({ v: SPACE_PROTOCOL_VERSION, t: "move", ...movement })) {
      this.lastSentMovement = { ...movement };
      // 예정 시각을 누적해 평균 100 ms 로 맞춤. 한 칸 넘게 쉬었으면 지금부터 다시 셈.
      // 잠깐 멈췄다 보낼 때도 여유 이상은 당기지 않음. 몰아 보내면 대역만 씀.
      const scheduledAt = this.lastMovementSentAt + movementIntervalMs;
      this.lastMovementSentAt =
        scheduledAt < now - movementIntervalMs
          ? now
          : Math.max(scheduledAt, now - movementSendToleranceMs);
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
    const backoffDelayMs = Math.min(Math.round(baseDelayMs * (0.75 + randomValue * 0.5)), 30_000);
    // 쉬는 시간이 남았으면 백오프보다 그쪽을 따름. 먼저 올라가면 창만 길어짐.
    const delayMs = Math.max(backoffDelayMs, this.rateLimitedUntil - this.options.now());
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
    this.finishPendingNickname(false);
    this.finishPendingModel(false);

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
