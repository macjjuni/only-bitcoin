import { DurableObject } from "cloudflare:workers";
import { resolveColorIndexFromClientKey } from "../../../src/entities/space/lib/clientKeyHash";
import { encodeSpaceSnapshot } from "../../../src/entities/space/lib/spaceSnapshot";
import { createSpawnPoint } from "../../../src/entities/space/lib/spawnPoint";
import { SPACE_DEFAULT_AVATAR_MODEL_INDEX } from "../../../src/entities/space/model/avatarModel";
import {
  parseSpaceClientFrame,
  SPACE_CHAT_COOLDOWN_MS,
  SPACE_CHAT_MAX_GRAPHEMES,
  SPACE_NETWORK_INTERVAL_MS,
  SPACE_NICKNAME_COOLDOWN_MS,
  SPACE_PROTOCOL_VERSION,
  type SpaceClientFrame,
  type SpacePeer,
  type SpaceServerFrame,
} from "../../../src/entities/space/model/spaceProtocol";
import {
  SPACE_BOUNDS,
  SPACE_MAX_ALTITUDE,
  SPACE_MAX_OCCUPANTS,
} from "../../../src/entities/space/model/spaceWorld";
import { createSha256Hex, deriveStableActorKey } from "./lib/crypto";
import { getSpaceIpConnectionLimit } from "./lib/spaceConnectionLimit";
import {
  ChatValidationError,
  countGraphemes,
  normalizeChatMessage,
  normalizeNickname,
} from "./lib/textValidation";
import type { ChatWorkerEnv } from "./types";

interface SayReceipt {
  rid: string;
  id: string;
  bodyHash: string;
  createdAt: number;
}

interface SpaceSocketAttachment {
  /**
   * 소켓에 붙여 둔 상태의 버전.
   *
   * 프레임 버전과 같은 값을 쓴다. 프로토콜이 바뀌면 재배포 전에 붙은 소켓의
   * 상태도 더 이상 믿을 수 없으므로, 한 숫자로 묶어 두면 둘이 어긋날 일이 없다.
   */
  v: typeof SPACE_PROTOCOL_VERSION;
  joined: boolean;
  ipGuardKey: string;
  joinDeadlineAt?: number;
  stableActorKey?: string;
  peer?: SpacePeer;
  lastActivityAt: number;
  lastMoveAt: number;
  movementBudget: number;
  lastSayAt: number | null;
  lastNickAt?: number | null;
  recentSayReceipts: SayReceipt[];
}

const MAXIMUM_PENDING_CONNECTIONS = 10;
const MAXIMUM_FRAME_BYTES = 8 * 1024;
const MAXIMUM_FRAMES_PER_SECOND = 40;
const MAXIMUM_RECENT_SAY_RECEIPTS = 32;
const JOIN_TIMEOUT_MS = 10_000;
const STALE_CONNECTION_MS = 60_000;
const PRUNE_INTERVAL_MS = 15_000;
const MINIMUM_MOVE_INTERVAL_MS = 70;
/** 클라이언트 달리기 8 m/s에 전송·적분 오차 여유만 더한다. */
const MAXIMUM_SPEED_METERS_PER_SECOND = 8.5;
/**
 * 한 번에 인정하는 최대 이동 거리.
 *
 * 맵 대각선이다. 이보다 멀리 가는 이동은 어떤 예산이 쌓여도 받지 않는다.
 * 높이도 포함한다 — 섬은 층이 여러 개라 수직 이동도 실제 거리다.
 */
const MAXIMUM_MOVEMENT_BUDGET = Math.hypot(
  SPACE_BOUNDS.maxX - SPACE_BOUNDS.minX,
  SPACE_MAX_ALTITUDE,
  SPACE_BOUNDS.maxZ - SPACE_BOUNDS.minZ,
);
const textEncoder = new TextEncoder();

/**
 * 좌석·위치는 WebSocket attachment에만 보관한다. SQL 위치 쓰기나 상시 틱은 없다.
 * 실제 이동이 들어올 때만 100ms 타이머 하나를 만들고 변경 좌석을 한 버퍼로 전송한다.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export class SpaceRoom extends DurableObject<ChatWorkerEnv> {
  private socketsBySeat = new Map<number, WebSocket>();
  private dirtySeats = new Set<number>();
  private snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  private joinTimers = new Map<WebSocket, ReturnType<typeof setTimeout>>();
  private joiningSockets = new Set<WebSocket>();
  private sayingSockets = new Set<WebSocket>();
  private frameRates = new Map<WebSocket, { startedAt: number; count: number }>();
  private lastPrunedAt = 0;

  constructor(
    private readonly state: DurableObjectState,
    private readonly workerEnv: ChatWorkerEnv,
  ) {
    super(state, workerEnv);
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));

    for (const socket of this.state.getWebSockets()) {
      const attachment = this.getAttachment(socket);

      if (!attachment || socket.readyState !== 1) {
        continue;
      }
      if (attachment.joined && attachment.peer && attachment.stableActorKey) {
        this.socketsBySeat.set(attachment.peer.seat, socket);
      } else if (attachment.joinDeadlineAt) {
        this.scheduleJoinDeadline(socket, attachment.joinDeadlineAt);
      }
    }
  }

  // region [Privates]
  private getAttachment(socket: WebSocket): SpaceSocketAttachment | null {
    let attachment: unknown;

    try {
      attachment = socket.deserializeAttachment();
    } catch {
      return null;
    }

    if (typeof attachment !== "object" || attachment === null) {
      return null;
    }
    const candidate = attachment as Partial<SpaceSocketAttachment>;

    return candidate.v === SPACE_PROTOCOL_VERSION &&
      typeof candidate.joined === "boolean" &&
      typeof candidate.ipGuardKey === "string" &&
      Array.isArray(candidate.recentSayReceipts)
      ? (candidate as SpaceSocketAttachment)
      : null;
  }

  private getJoinedAttachment(socket: WebSocket): SpaceSocketAttachment | null {
    const attachment = this.getAttachment(socket);

    return attachment?.joined &&
      attachment.peer &&
      this.socketsBySeat.get(attachment.peer.seat) === socket
      ? attachment
      : null;
  }

  private sendPayload(socket: WebSocket, payload: string | ArrayBuffer): void {
    try {
      socket.send(payload);
    } catch {
      this.removeSocket(socket, 1011, "send failed");
    }
  }

  private sendFrame(socket: WebSocket, frame: SpaceServerFrame): void {
    this.sendPayload(socket, JSON.stringify(frame));
  }

  private sendError(socket: WebSocket, code: string, message: string, rid?: string): void {
    this.sendFrame(socket, { v: SPACE_PROTOCOL_VERSION, t: "error", code, message, ...(rid ? { rid } : {}) });
  }

  private broadcastFrame(frame: SpaceServerFrame, excludedSocket?: WebSocket): void {
    const payload = JSON.stringify(frame);

    for (const socket of this.socketsBySeat.values()) {
      if (socket !== excludedSocket) {
        this.sendPayload(socket, payload);
      }
    }
  }

  private clearJoinDeadline(socket: WebSocket): void {
    const timer = this.joinTimers.get(socket);

    if (timer !== undefined) {
      clearTimeout(timer);
      this.joinTimers.delete(socket);
    }
  }

  /** cold close에서 좌석 메타데이터도 없을 때만 전체 roster를 한 번 재동기화한다. */
  private reconcileRoster(): void {
    const connectedPeers = Array.from(this.socketsBySeat.values()).flatMap((socket) => {
      const peer = this.getJoinedAttachment(socket)?.peer;
      return socket.readyState === 1 && peer ? [{ socket, peer }] : [];
    });

    for (const current of connectedPeers) {
      this.sendFrame(current.socket, {
        v: SPACE_PROTOCOL_VERSION,
        t: "welcome",
        self: current.peer,
        peers: connectedPeers
          .filter((entry) => entry.socket !== current.socket)
          .map((entry) => entry.peer),
      });
    }
  }

  private scheduleJoinDeadline(socket: WebSocket, deadline: number): void {
    this.clearJoinDeadline(socket);
    this.joinTimers.set(
      socket,
      setTimeout(
        () => {
          this.joinTimers.delete(socket);
          const attachment = this.getAttachment(socket);

          if (attachment && !attachment.joined) {
            this.sendError(socket, "JOIN_TIMEOUT", "입장 준비 시간이 초과됐어요.");
            this.removeSocket(socket, 4009, "join timeout");
          }
        },
        Math.max(0, deadline - Date.now()),
      ),
    );
  }

  private removeSocket(
    socket: WebSocket,
    closeCode = 1000,
    reason = "left",
    shouldAnnounceLeave = true,
  ): void {
    this.clearJoinDeadline(socket);
    this.frameRates.delete(socket);
    const attachment = this.getAttachment(socket);
    const warmSeat = Array.from(this.socketsBySeat).find(
      ([, currentSocket]) => currentSocket === socket,
    )?.[0];
    const attachedSeat = attachment?.joined ? attachment.peer?.seat : undefined;
    // close로 깨어난 직후에는 종료 소켓이 getWebSockets에서 이미 빠졌을 수 있다.
    const coldSeat = attachedSeat !== undefined && !this.socketsBySeat.has(attachedSeat)
      ? attachedSeat
      : undefined;
    const ownedSeat = warmSeat ?? coldSeat;

    if (attachment?.joined && socket.readyState === 1) {
      socket.serializeAttachment({ ...attachment, joined: false });
    }
    if (ownedSeat !== undefined) {
      this.socketsBySeat.delete(ownedSeat);
      this.dirtySeats.delete(ownedSeat);

      if (shouldAnnounceLeave) {
        this.broadcastFrame({ v: SPACE_PROTOCOL_VERSION, t: "leave", seat: ownedSeat });
      }
    } else if (!attachment && shouldAnnounceLeave) {
      // 희소 위치 delta만으로는 사라진 좌석을 추론할 수 없으므로 누락된 leave를 보완한다.
      this.reconcileRoster();
    }
    if (this.dirtySeats.size === 0 && this.snapshotTimer !== null) {
      clearTimeout(this.snapshotTimer);
      this.snapshotTimer = null;
    }

    try {
      if (socket.readyState < 2) {
        socket.close(closeCode, reason);
      }
    } catch {
      // 이미 종료된 소켓도 좌석과 타이머 정리는 완료한다.
    }
  }

  /** ping은 런타임에서 응답한다. 유령 좌석 정리도 다른 실제 이벤트가 있을 때만 수행한다. */
  private pruneStaleConnections(): void {
    const now = Date.now();

    if (now - this.lastPrunedAt < PRUNE_INTERVAL_MS) {
      return;
    }
    this.lastPrunedAt = now;

    for (const socket of this.state.getWebSockets()) {
      const attachment = this.getAttachment(socket);

      if (!attachment) {
        continue;
      }
      const lastPongAt = this.state.getWebSocketAutoResponseTimestamp(socket)?.getTime() ?? 0;
      const isStale = attachment.joined
        ? now - Math.max(attachment.lastActivityAt, lastPongAt) > STALE_CONNECTION_MS
        : (attachment.joinDeadlineAt ?? 0) <= now;

      if (isStale || socket.readyState !== 1) {
        this.removeSocket(socket, 4000, "inactive connection");
      }
    }
  }

  private scheduleSnapshot(): void {
    if (this.snapshotTimer !== null) {
      return;
    }
    this.snapshotTimer = setTimeout(() => {
      this.snapshotTimer = null;
      this.pruneStaleConnections();
      const players = Array.from(this.dirtySeats).flatMap((seat) => {
        const socket = this.socketsBySeat.get(seat);
        const peer = socket ? this.getJoinedAttachment(socket)?.peer : null;

        return peer
          ? [{ seat, x: peer.x, y: peer.y, z: peer.z, yaw: peer.yaw, isRunning: peer.isRunning }]
          : [];
      });
      this.dirtySeats.clear();

      if (players.length === 0) {
        return;
      }
      const snapshot = encodeSpaceSnapshot({ timestamp: Date.now() >>> 0, players });

      for (const socket of this.socketsBySeat.values()) {
        this.sendPayload(socket, snapshot);
      }
    }, SPACE_NETWORK_INTERVAL_MS);
  }

  private canProcessFrame(socket: WebSocket): boolean {
    const now = Date.now();
    const frameRate = this.frameRates.get(socket);

    if (!frameRate || now - frameRate.startedAt >= 1000) {
      this.frameRates.set(socket, { startedAt: now, count: 1 });
      return true;
    }
    frameRate.count += 1;

    if (frameRate.count > MAXIMUM_FRAMES_PER_SECOND) {
      this.sendError(socket, "RATE_LIMIT", "입력이 너무 빠르게 들어왔어요.");
      this.removeSocket(socket, 4008, "rate limit");
      return false;
    }

    return true;
  }

  private async handleJoin(
    socket: WebSocket,
    frame: Extract<SpaceClientFrame, { t: "join" }>,
  ): Promise<void> {
    if (this.getJoinedAttachment(socket) || this.joiningSockets.has(socket)) {
      this.sendError(socket, "ALREADY_JOINED", "이미 입장한 연결이에요.");
      return;
    }
    this.joiningSockets.add(socket);

    try {
      const nickname = normalizeNickname(frame.nickname);
      const stableActorKey = await deriveStableActorKey(
        this.workerEnv.ENFORCEMENT_SECRET,
        frame.clientKey,
      );
      const attachment = this.getAttachment(socket);

      if (!attachment || socket.readyState !== 1 || (attachment.joinDeadlineAt ?? 0) < Date.now()) {
        return;
      }
      this.pruneStaleConnections();
      const previousSocket = Array.from(this.socketsBySeat.values()).find(
        (candidate) => this.getAttachment(candidate)?.stableActorKey === stableActorKey,
      );
      const previousAttachment = previousSocket ? this.getJoinedAttachment(previousSocket) : null;
      const previousPeer = previousAttachment?.peer;
      const seat =
        previousPeer?.seat ??
        Array.from({ length: SPACE_MAX_OCCUPANTS }, (_, index) => index).find(
          (candidate) => !this.socketsBySeat.has(candidate),
        );

      if (seat === undefined) {
        this.sendFrame(socket, { v: SPACE_PROTOCOL_VERSION, t: "full" });
        this.removeSocket(socket, 4003, "room full");
        return;
      }
      const now = Date.now();
      // 스폰과 색은 클라이언트도 같은 값을 계산할 수 있어야 한다. 비밀키에서 파생한
      // stableActorKey 로 뽑으면 입장 직후 welcome 이 아바타를 순간이동시킨다.
      const peer: SpacePeer = {
        ...(previousPeer ?? createSpawnPoint(frame.clientKey)),
        seat,
        nickname,
        colorIndex: resolveColorIndexFromClientKey(frame.clientKey),
        // 아바타 모델은 클라이언트가 고른다. 색·스폰과 달리 서버가 정할 근거가
        // 없고, 프레임 파서가 이미 목록 범위를 검증한다. 모델 선택을 모르는
        // 옛 클라이언트는 이 값을 보내지 않으므로 기본 모델로 받는다.
        modelIndex: frame.modelIndex ?? SPACE_DEFAULT_AVATAR_MODEL_INDEX,
        isRunning: false,
      };

      if (previousSocket) {
        this.sendError(previousSocket, "SESSION_REPLACED", "다른 탭에서 스페이스에 접속했어요.");
        // 새 연결이 같은 좌석을 물려받을 때만 leave 를 생략한다. 다른 좌석을 받으면
        // 옛 좌석이 다른 클라이언트에 유령으로 남는다.
        this.removeSocket(previousSocket, 4001, "session replaced", previousPeer?.seat !== seat);
      }

      socket.serializeAttachment({
        ...attachment,
        joined: true,
        joinDeadlineAt: undefined,
        stableActorKey,
        peer,
        lastActivityAt: now,
        lastMoveAt: now,
        movementBudget: previousAttachment?.movementBudget ?? 0.5,
        lastSayAt: previousAttachment?.lastSayAt ?? null,
        recentSayReceipts: previousAttachment?.recentSayReceipts ?? [],
      } satisfies SpaceSocketAttachment);
      this.socketsBySeat.set(seat, socket);
      this.clearJoinDeadline(socket);
      const peers = Array.from(this.socketsBySeat.values()).flatMap((candidate) => {
        const currentPeer = this.getJoinedAttachment(candidate)?.peer;
        return candidate !== socket && currentPeer ? [currentPeer] : [];
      });
      this.sendFrame(socket, { v: SPACE_PROTOCOL_VERSION, t: "welcome", self: peer, peers });

      if (this.getJoinedAttachment(socket)) {
        this.broadcastFrame({ v: SPACE_PROTOCOL_VERSION, t: "peer", peer }, socket);
      }
    } finally {
      this.joiningSockets.delete(socket);
    }
  }

  private handleMove(socket: WebSocket, frame: Extract<SpaceClientFrame, { t: "move" }>): void {
    const attachment = this.getJoinedAttachment(socket);
    const peer = attachment?.peer;

    if (!attachment || !peer) {
      this.sendError(socket, "JOIN_REQUIRED", "먼저 공간에 입장해 주세요.");
      return;
    }
    const now = Date.now();
    const elapsed = Math.max(0, now - attachment.lastMoveAt);

    if (elapsed < MINIMUM_MOVE_INTERVAL_MS) {
      return;
    }
    const availableDistance = Math.min(
      MAXIMUM_MOVEMENT_BUDGET,
      attachment.movementBudget + (elapsed / 1000) * MAXIMUM_SPEED_METERS_PER_SECOND,
    );
    // 높이도 거리에 넣는다. 벙커는 바닥이 평평해 `y` 가 점프뿐이라 뺐지만,
    // 섬에서는 궁전 단과 바다가 11 m 차이라 수직 순간이동이 실제 이동이 된다.
    const distance = Math.hypot(frame.x - peer.x, frame.y - peer.y, frame.z - peer.z);
    const isInBounds =
      frame.x >= SPACE_BOUNDS.minX &&
      frame.x <= SPACE_BOUNDS.maxX &&
      frame.z >= SPACE_BOUNDS.minZ &&
      frame.z <= SPACE_BOUNDS.maxZ &&
      // 섬 전체를 덮는 높이 상한만 본다. 층별 판정은 서버가 지형을 모르므로
      // 할 수 없고, 클라이언트의 지형 충돌이 맡는다.
      frame.y >= 0 &&
      frame.y <= SPACE_MAX_ALTITUDE;

    if (!isInBounds || distance > availableDistance) {
      this.sendError(socket, "INVALID_MOVE", "이동 가능한 범위와 속도를 확인해 주세요.");
      this.sendFrame(socket, { v: SPACE_PROTOCOL_VERSION, t: "peer", peer });
      return;
    }
    const yaw = Math.atan2(Math.sin(frame.yaw), Math.cos(frame.yaw));

    if (
      peer.x === frame.x &&
      peer.y === frame.y &&
      peer.z === frame.z &&
      peer.yaw === yaw &&
      peer.isRunning === frame.isRunning
    ) {
      return;
    }
    socket.serializeAttachment({
      ...attachment,
      peer: { ...peer, x: frame.x, y: frame.y, z: frame.z, yaw, isRunning: frame.isRunning },
      lastMoveAt: now,
      lastActivityAt: now,
      movementBudget: availableDistance - distance,
    } satisfies SpaceSocketAttachment);
    this.dirtySeats.add(peer.seat);
    this.scheduleSnapshot();
  }

  /**
   * 닉네임을 바꾸고 모두에게 알린다.
   *
   * `peer` 프레임은 좌표까지 함께 담고 있어 본인에게도 그대로 보낸다. 수신 쪽은
   * 좌표가 그대로면 위치를 되감지 않는다.
   */
  private async handleNick(
    socket: WebSocket,
    frame: Extract<SpaceClientFrame, { t: "nick" }>,
  ): Promise<void> {
    const nickname = normalizeNickname(frame.nickname);
    const attachment = this.getJoinedAttachment(socket);
    const peer = attachment?.peer;

    if (!attachment || !peer) {
      this.sendError(socket, "JOIN_REQUIRED", "먼저 공간에 입장해 주세요.", frame.rid);
      return;
    }
    if (peer.nickname === nickname) {
      this.sendFrame(socket, { v: SPACE_PROTOCOL_VERSION, t: "peer", peer });
      return;
    }
    const now = Date.now();

    if (attachment.lastNickAt != null && now - attachment.lastNickAt < SPACE_NICKNAME_COOLDOWN_MS) {
      this.sendError(
        socket,
        "RATE_NICK_INTERVAL",
        "닉네임은 10초에 한 번 바꿀 수 있어요.",
        frame.rid,
      );
      return;
    }
    const renamed: SpacePeer = { ...peer, nickname };
    socket.serializeAttachment({
      ...attachment,
      peer: renamed,
      lastActivityAt: now,
      lastNickAt: now,
    } satisfies SpaceSocketAttachment);
    this.broadcastFrame({ v: SPACE_PROTOCOL_VERSION, t: "peer", peer: renamed });
  }

  /**
   * 아바타 모델을 바꾼다.
   *
   * 닉네임과 같은 흐름이다. 다만 **쿨다운을 두지 않는다** — 이름은 자주 바뀌면
   * 누가 누군지 못 따라가지만, 모델은 그 사람의 좌석·색·이름이 그대로라 혼동이
   * 생기지 않는다. 프레임 수 제한(초당 40)이 이미 연타를 막는다.
   */
  private async handleModel(
    socket: WebSocket,
    frame: Extract<SpaceClientFrame, { t: "model" }>,
  ): Promise<void> {
    const attachment = this.getJoinedAttachment(socket);
    const peer = attachment?.peer;

    if (!attachment || !peer) {
      this.sendError(socket, "JOIN_REQUIRED", "먼저 공간에 입장해 주세요.", frame.rid);
      return;
    }
    if (peer.modelIndex === frame.modelIndex) {
      this.sendFrame(socket, { v: SPACE_PROTOCOL_VERSION, t: "peer", peer });
      return;
    }
    const changed: SpacePeer = { ...peer, modelIndex: frame.modelIndex };
    socket.serializeAttachment({
      ...attachment,
      peer: changed,
      lastActivityAt: Date.now(),
    } satisfies SpaceSocketAttachment);
    this.broadcastFrame({ v: SPACE_PROTOCOL_VERSION, t: "peer", peer: changed });
  }

  private async handleSay(
    socket: WebSocket,
    frame: Extract<SpaceClientFrame, { t: "say" }>,
  ): Promise<void> {
    if (this.sayingSockets.has(socket)) {
      this.sendError(
        socket,
        "RATE_SAY_INTERVAL",
        "메시지는 3초에 한 번 보낼 수 있어요.",
        frame.rid,
      );
      return;
    }
    this.sayingSockets.add(socket);

    try {
      const body = normalizeChatMessage(frame.body);
      if (countGraphemes(body) > SPACE_CHAT_MAX_GRAPHEMES) {
        throw new ChatValidationError(
          "BODY_TOO_LONG",
          `공간 메시지는 최대 ${SPACE_CHAT_MAX_GRAPHEMES}자까지 작성할 수 있어요.`,
        );
      }
      const bodyHash = await createSha256Hex(body);
      const attachment = this.getJoinedAttachment(socket);
      const peer = attachment?.peer;

      if (!attachment || !peer) {
        this.sendError(socket, "JOIN_REQUIRED", "먼저 공간에 입장해 주세요.", frame.rid);
        return;
      }
      const previousReceipt = attachment.recentSayReceipts.find(
        (receipt) => receipt.rid === frame.rid,
      );

      if (previousReceipt) {
        if (previousReceipt.bodyHash !== bodyHash) {
          this.sendError(socket, "REQUEST_ID_REUSED", "이미 사용한 요청 번호예요.", frame.rid);
          return;
        }
        this.sendFrame(socket, {
          v: SPACE_PROTOCOL_VERSION,
          t: "say",
          message: {
            id: previousReceipt.id,
            rid: frame.rid,
            seat: peer.seat,
            nickname: peer.nickname,
            body,
            createdAt: previousReceipt.createdAt,
          },
        });
        return;
      }
      const now = Date.now();

      if (attachment.lastSayAt !== null && now - attachment.lastSayAt < SPACE_CHAT_COOLDOWN_MS) {
        this.sendError(
          socket,
          "RATE_SAY_INTERVAL",
          "메시지는 3초에 한 번 보낼 수 있어요.",
          frame.rid,
        );
        return;
      }
      const message = {
        id: crypto.randomUUID(),
        rid: frame.rid,
        seat: peer.seat,
        nickname: peer.nickname,
        body,
        createdAt: now,
      };
      const receipt: SayReceipt = { rid: frame.rid, id: message.id, bodyHash, createdAt: now };
      socket.serializeAttachment({
        ...attachment,
        lastActivityAt: now,
        lastSayAt: now,
        recentSayReceipts: [...attachment.recentSayReceipts, receipt].slice(
          -MAXIMUM_RECENT_SAY_RECEIPTS,
        ),
      } satisfies SpaceSocketAttachment);
      this.broadcastFrame({ v: SPACE_PROTOCOL_VERSION, t: "say", message });
    } finally {
      this.sayingSockets.delete(socket);
    }
  }
  // endregion


  // region [Transactions]
  async fetch(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);

    if (requestUrl.pathname !== "/v1/space/ws" || request.method !== "GET") {
      return new Response(null, { status: 404 });
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response(null, { status: 426, headers: { Upgrade: "websocket" } });
    }
    const ipGuardKey = request.headers.get("X-Chat-IP-Guard-Key");

    if (!ipGuardKey) {
      return new Response(null, { status: 403 });
    }
    this.pruneStaleConnections();
    const sockets = this.state.getWebSockets().filter((socket) => socket.readyState === 1);
    const pendingCount = sockets.filter((socket) => !this.getAttachment(socket)?.joined).length;
    const ipCount = sockets.filter(
      (socket) => this.getAttachment(socket)?.ipGuardKey === ipGuardKey,
    ).length;
    const ipConnectionLimit = getSpaceIpConnectionLimit(
      requestUrl,
      this.workerEnv.SPACE_DISABLE_IP_CONNECTION_LIMIT === "true",
    );

    if (
      pendingCount >= MAXIMUM_PENDING_CONNECTIONS ||
      ipCount >= ipConnectionLimit ||
      sockets.length >= SPACE_MAX_OCCUPANTS + MAXIMUM_PENDING_CONNECTIONS
    ) {
      return new Response(null, { status: 429, headers: { "Retry-After": "10" } });
    }
    const pair = new WebSocketPair();
    const server = pair[1];
    const now = Date.now();
    const attachment: SpaceSocketAttachment = {
      v: SPACE_PROTOCOL_VERSION,
      joined: false,
      ipGuardKey,
      joinDeadlineAt: now + JOIN_TIMEOUT_MS,
      lastActivityAt: now,
      lastMoveAt: now,
      movementBudget: 0.5,
      lastSayAt: null,
      recentSayReceipts: [],
    };
    server.serializeAttachment(attachment);
    this.state.acceptWebSocket(server);
    this.scheduleJoinDeadline(server, attachment.joinDeadlineAt ?? now);

    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  // endregion


  // region [Life Cycles]
  async webSocketMessage(socket: WebSocket, payload: string | ArrayBuffer): Promise<void> {
    if (
      typeof payload !== "string" ||
      payload.length > MAXIMUM_FRAME_BYTES ||
      textEncoder.encode(payload).byteLength > MAXIMUM_FRAME_BYTES
    ) {
      this.sendError(socket, "INVALID_PROTOCOL", "입력 형식을 확인해 주세요.");
      this.removeSocket(socket, 4002, "invalid frame");
      return;
    }
    if (!this.canProcessFrame(socket)) {
      return;
    }
    const frame = parseSpaceClientFrame(payload);

    if (!frame) {
      this.sendError(socket, "INVALID_PROTOCOL", "입력 형식을 확인해 주세요.");
      this.removeSocket(socket, 4002, "invalid protocol");
      return;
    }

    try {
      switch (frame.t) {
        case "join":
          await this.handleJoin(socket, frame);
          break;
        case "move":
          this.handleMove(socket, frame);
          break;
        case "say":
          await this.handleSay(socket, frame);
          break;
        case "nick":
          await this.handleNick(socket, frame);
          break;
        case "model":
          await this.handleModel(socket, frame);
          break;
        default:
          throw new Error("Unsupported space frame");
      }
    } catch (error) {
      const rid = "rid" in frame ? frame.rid : undefined;

      if (error instanceof ChatValidationError) {
        this.sendError(socket, error.code, error.message, rid);
      } else {
        this.sendError(socket, "UNAVAILABLE", "공간 요청을 처리하지 못했어요.", rid);
      }
    }
  }

  webSocketClose(socket: WebSocket): void {
    this.removeSocket(socket);
  }

  webSocketError(socket: WebSocket): void {
    this.removeSocket(socket, 1011, "connection error");
  }
  // endregion
}
