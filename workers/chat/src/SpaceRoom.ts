import { DurableObject } from "cloudflare:workers";
import { resolveColorIndexFromClientKey } from "../../../src/entities/space/lib/clientKeyHash";
import { encodeSpaceSnapshot } from "../../../src/entities/space/lib/spaceSnapshot";
import { createSpawnPoint } from "../../../src/entities/space/lib/spawnPoint";
import { SPACE_DEFAULT_AVATAR_MODEL_INDEX } from "../../../src/entities/space/model/avatarModel";
import {
  parseSpaceClientFrame,
  SPACE_CHAT_COOLDOWN_MS,
  SPACE_CHAT_HISTORY_COUNT,
  SPACE_CHAT_MAX_GRAPHEMES,
  SPACE_NETWORK_INTERVAL_MS,
  SPACE_NICKNAME_COOLDOWN_MS,
  SPACE_PROTOCOL_VERSION,
  SPACE_SERVER_FRAME_MAX_BYTES,
  type SpaceChatMessage,
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

interface ChatHistoryRow {
  [columnName: string]: string | number | ArrayBuffer | null;
  id: string;
  rid: string;
  seat: number;
  nickname: string;
  body: string;
  created_at: number;
}

interface SpaceSocketAttachment {
  /**
   * 소켓에 붙여 둔 상태의 버전.
   *
   * 프레임 버전과 같은 값을 씀. 프로토콜이 바뀌면 재배포 전에 붙은 소켓의
   * 상태도 못 믿으니 한 숫자로 묶어 둘이 어긋나지 않게 함.
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
/**
 * IP guard 키 하나가 1분에 보낼 수 있는 메시지 수.
 *
 * 연결당 3초 간격만으로는 IP 하나가 연결 2개로 분당 40개를 보낼 수 있음.
 * 기록 50개가 1분 남짓이면 다 덮여서 IP 단위로 한 번 더 묶음.
 */
const MAXIMUM_SAYS_PER_IP_PER_MINUTE = 12;
const SAY_RATE_WINDOW_MS = 60_000;
const JOIN_TIMEOUT_MS = 10_000;
const STALE_CONNECTION_MS = 60_000;
const PRUNE_INTERVAL_MS = 15_000;
/** 모바일 상향 지터로 두 이동이 붙어 와도 마지막 위치를 버리지 않게 넉넉히 낮춤. */
const MINIMUM_MOVE_INTERVAL_MS = 50;
/** 마지막 이동 뒤 더 보내는 빈 틱 수. 클라이언트의 정지 판정용. */
const TRAILING_SNAPSHOT_TICKS = 2;
/** 클라이언트 달리기 8 m/s에 전송·적분 오차 여유만 더함. */
const MAXIMUM_SPEED_METERS_PER_SECOND = 8.5;
/**
 * 한 번에 인정하는 최대 이동 거리.
 *
 * 맵 대각선임. 이보다 먼 이동은 예산이 쌓여도 안 받음.
 * 높이도 넣음. 섬은 층이 여러 개라 수직 이동도 실제 거리임.
 */
const MAXIMUM_MOVEMENT_BUDGET = Math.hypot(
  SPACE_BOUNDS.maxX - SPACE_BOUNDS.minX,
  SPACE_MAX_ALTITUDE,
  SPACE_BOUNDS.maxZ - SPACE_BOUNDS.minZ,
);
const textEncoder = new TextEncoder();

/**
 * 좌석·위치는 WebSocket attachment에만 둠. SQL 위치 쓰기나 상시 틱은 없음.
 * 이동이 들어오면 100ms 고정 틱을 돌리고, 멈추면 꼬리 틱 2개 뒤 끔.
 *
 * SQL은 대화 기록에만 씀. 하이버네이션으로 메모리가 비워져도 입장자가 최근
 * 대화를 받아야 해서, 말할 때 한 줄 쓰고 깨어난 뒤 첫 입장 때 한 번 읽음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export class SpaceRoom extends DurableObject<ChatWorkerEnv> {
  private socketsBySeat = new Map<number, WebSocket>();
  private dirtySeats = new Set<number>();
  private snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  private nextSnapshotAt = 0;
  /** 이동 없이 지나간 틱 수. 꼬리 틱을 몇 번 보냈는지 셈. */
  private idleSnapshotTicks = 0;
  private joinTimers = new Map<WebSocket, ReturnType<typeof setTimeout>>();
  private joiningSockets = new Set<WebSocket>();
  private sayingSockets = new Set<WebSocket>();
  private frameRates = new Map<WebSocket, { startedAt: number; count: number }>();
  private lastPrunedAt = 0;
  private chatHistory: SpaceChatMessage[] | null = null;
  private isChatHistorySchemaReady = false;
  private isSayLogSchemaReady = false;

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

  private ensureChatHistorySchema(): void {
    if (this.isChatHistorySchemaReady) {
      return;
    }
    this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL,
        rid TEXT NOT NULL,
        seat INTEGER NOT NULL,
        nickname TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
    this.isChatHistorySchemaReady = true;
  }

  /** 기록 읽기가 실패해도 입장은 막지 않음. 빈 기록으로 넘김. */
  private getChatHistory(): SpaceChatMessage[] {
    if (this.chatHistory) {
      return this.chatHistory;
    }

    try {
      this.ensureChatHistorySchema();
      this.chatHistory = this.state.storage.sql
        .exec<ChatHistoryRow>(
          `SELECT id, rid, seat, nickname, body, created_at
             FROM chat_messages
            ORDER BY seq DESC
            LIMIT ?`,
          SPACE_CHAT_HISTORY_COUNT,
        )
        .toArray()
        .reverse()
        .map((row) => ({
          id: row.id,
          rid: row.rid,
          seat: row.seat,
          nickname: row.nickname,
          body: row.body,
          createdAt: row.created_at,
        }));
    } catch {
      return [];
    }

    return this.chatHistory;
  }

  /** 저장이 실패해도 방송은 계속함. 기록에서만 빠짐. */
  private appendChatHistory(message: SpaceChatMessage): void {
    const history = this.getChatHistory();
    // 읽기에 실패한 빈 기록을 캐시로 굳히면 옛 대화가 안 보이게 됨.
    const hasLoadedHistory = this.chatHistory !== null;

    try {
      this.ensureChatHistorySchema();
      this.state.storage.sql.exec(
        `INSERT INTO chat_messages (id, rid, seat, nickname, body, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        message.id,
        message.rid,
        message.seat,
        message.nickname,
        message.body,
        message.createdAt,
      );
      this.state.storage.sql.exec(
        `DELETE FROM chat_messages
          WHERE seq NOT IN (
            SELECT seq FROM chat_messages ORDER BY seq DESC LIMIT ?
          )`,
        SPACE_CHAT_HISTORY_COUNT,
      );
    } catch {
      // 다음 입장 때 다시 읽게 캐시를 버림.
      this.chatHistory = null;
      return;
    }

    if (hasLoadedHistory) {
      this.chatHistory = [...history, message].slice(-SPACE_CHAT_HISTORY_COUNT);
    }
  }

  /**
   * 입장 프레임을 클라이언트 한도 안으로 맞춤.
   *
   * 메시지는 100자여도 결합 문자·긴 이모지면 수 KB 가 될 수 있음. 50개를 다 담으면
   * 64KB 를 넘겨 클라이언트가 프레임을 버리고 아무도 입장하지 못함. 넘치면 오래된
   * 메시지부터 뺌.
   */
  private createWelcomePayload(self: SpacePeer, peers: SpacePeer[]): string {
    const messages = [...this.getChatHistory()];
    const serialize = (): string =>
      JSON.stringify({ v: SPACE_PROTOCOL_VERSION, t: "welcome", self, peers, messages } satisfies SpaceServerFrame);
    let payload = serialize();

    while (messages.length > 0 && textEncoder.encode(payload).byteLength > SPACE_SERVER_FRAME_MAX_BYTES) {
      messages.shift();
      payload = serialize();
    }

    return payload;
  }

  private ensureSayLogSchema(): void {
    if (this.isSayLogSchemaReady) {
      return;
    }
    this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS say_log (
        ip_guard_key TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS say_log_ip_created_at ON say_log (ip_guard_key, created_at);
    `);
    this.isSayLogSchemaReady = true;
  }

  /**
   * 이 IP 가 최근 1분 동안 보낸 메시지가 한도에 찼는지 봄.
   *
   * 메모리에 두면 하이버네이션 뒤 초기화돼서 SQL 에 둠. 읽기가 실패하면 막지
   * 않고 통과시킴. 연결당 3초 간격은 그대로 걸려 있음.
   */
  private isIpSayLimitReached(ipGuardKey: string, now: number): boolean {
    try {
      this.ensureSayLogSchema();
      const row = this.state.storage.sql
        .exec<{ count: number }>(
          "SELECT COUNT(*) AS count FROM say_log WHERE ip_guard_key = ? AND created_at > ?",
          ipGuardKey,
          now - SAY_RATE_WINDOW_MS,
        )
        .toArray()[0];

      return (row?.count ?? 0) >= MAXIMUM_SAYS_PER_IP_PER_MINUTE;
    } catch {
      return false;
    }
  }

  /** 보낸 기록을 남기고 1분 지난 줄은 지움. 실패해도 방송은 막지 않음. */
  private recordIpSay(ipGuardKey: string, now: number): void {
    try {
      this.ensureSayLogSchema();
      this.state.storage.sql.exec(
        "DELETE FROM say_log WHERE created_at <= ?",
        now - SAY_RATE_WINDOW_MS,
      );
      this.state.storage.sql.exec(
        "INSERT INTO say_log (ip_guard_key, created_at) VALUES (?, ?)",
        ipGuardKey,
        now,
      );
    } catch {
      // 한 번 빠져도 다음 메시지부터 다시 셈.
    }
  }

  private clearJoinDeadline(socket: WebSocket): void {
    const timer = this.joinTimers.get(socket);

    if (timer !== undefined) {
      clearTimeout(timer);
      this.joinTimers.delete(socket);
    }
  }

  /** cold close에서 좌석 메타데이터도 없을 때만 전체 roster를 한 번 재동기화함. */
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
    // close로 깨어난 직후엔 종료 소켓이 getWebSockets에서 이미 빠졌을 수 있음.
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
      // 희소 위치 delta로는 사라진 좌석을 알 수 없어 누락된 leave를 보완함.
      this.reconcileRoster();
    }
    if (this.socketsBySeat.size === 0) {
      this.stopSnapshotTimer();
    }

    try {
      if (socket.readyState < 2) {
        socket.close(closeCode, reason);
      }
    } catch {
      // 이미 닫힌 소켓도 좌석·타이머 정리는 끝냄.
    }
  }

  /** ping은 런타임이 응답함. 유령 좌석 정리도 다른 실제 이벤트가 있을 때만 함. */
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

  /** 쉬고 있으면 틱을 새로 시작함. 이미 돌고 있으면 그 박자를 그대로 씀. */
  private scheduleSnapshot(): void {
    if (this.snapshotTimer !== null) {
      return;
    }
    this.nextSnapshotAt = Date.now() + SPACE_NETWORK_INTERVAL_MS;
    this.idleSnapshotTicks = 0;
    this.armSnapshotTimer();
  }

  /** 예정 시각에 맞춰 걸어 타이머 지연이 다음 틱에 쌓이지 않게 함. */
  private armSnapshotTimer(): void {
    const delay = Math.max(0, this.nextSnapshotAt - Date.now());
    this.snapshotTimer = setTimeout(() => this.flushSnapshot(), delay);
  }

  private stopSnapshotTimer(): void {
    if (this.snapshotTimer !== null) {
      clearTimeout(this.snapshotTimer);
      this.snapshotTimer = null;
    }
  }

  /**
   * 고정 100 ms 틱으로 변경 좌석을 보냄.
   *
   * 전에는 이동이 올 때마다 100 ms 타이머를 새로 걸어 실제 간격이 100~230 ms 로 흔들렸음.
   * 이제 박자를 고정하고 타임스탬프도 예정 시각으로 찍음. 마지막 이동 뒤 빈 틱을
   * `TRAILING_SNAPSHOT_TICKS` 번 더 보내 "다들 멈췄음" 을 알림. 클라이언트는 이걸로
   * 멈춘 사람과 패킷이 늦은 사람을 가려 외삽 여부를 정함.
   */
  private flushSnapshot(): void {
    this.snapshotTimer = null;
    this.pruneStaleConnections();
    const now = Date.now();
    // 한 틱 넘게 밀렸으면 박자를 지금으로 다시 맞춤.
    const tickAt =
      now - this.nextSnapshotAt > SPACE_NETWORK_INTERVAL_MS ? now : this.nextSnapshotAt;
    const players = Array.from(this.dirtySeats).flatMap((seat) => {
      const socket = this.socketsBySeat.get(seat);
      const peer = socket ? this.getJoinedAttachment(socket)?.peer : null;

      return peer
        ? [{ seat, x: peer.x, y: peer.y, z: peer.z, yaw: peer.yaw, isRunning: peer.isRunning }]
        : [];
    });
    this.dirtySeats.clear();
    this.idleSnapshotTicks = players.length === 0 ? this.idleSnapshotTicks + 1 : 0;

    if (this.idleSnapshotTicks > TRAILING_SNAPSHOT_TICKS || this.socketsBySeat.size === 0) {
      return;
    }
    const snapshot = encodeSpaceSnapshot({ timestamp: tickAt >>> 0, players });

    for (const socket of this.socketsBySeat.values()) {
      this.sendPayload(socket, snapshot);
    }
    this.nextSnapshotAt = tickAt + SPACE_NETWORK_INTERVAL_MS;
    this.armSnapshotTimer();
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
      // 스폰·색은 클라이언트도 같은 값을 계산해야 함. 비밀키에서 파생한
      // stableActorKey 로 뽑으면 입장 직후 welcome 이 아바타를 순간이동시킴.
      const peer: SpacePeer = {
        ...(previousPeer ?? createSpawnPoint(frame.clientKey)),
        seat,
        nickname,
        colorIndex: resolveColorIndexFromClientKey(frame.clientKey),
        // 아바타 모델은 클라이언트가 고름. 색·스폰과 달리 서버가 정할 근거가
        // 없고 프레임 파서가 이미 목록 범위를 검증함. 모델 선택을 모르는
        // 옛 클라이언트는 이 값을 안 보내서 기본 모델로 받음.
        modelIndex: frame.modelIndex ?? SPACE_DEFAULT_AVATAR_MODEL_INDEX,
        isRunning: false,
      };

      if (previousSocket) {
        this.sendError(previousSocket, "SESSION_REPLACED", "다른 탭에서 스페이스에 접속했어요.");
        // 새 연결이 같은 좌석을 물려받을 때만 leave 를 생략함. 다른 좌석을 받으면
        // 옛 좌석이 다른 클라이언트에 유령으로 남음.
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
      this.sendPayload(socket, this.createWelcomePayload(peer, peers));

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
    // 높이도 거리에 넣음. 벙커는 바닥이 평평해 `y` 가 점프뿐이라 뺐지만,
    // 섬은 궁전 단과 바다가 11 m 차이라 수직 순간이동도 실제 이동임.
    const distance = Math.hypot(frame.x - peer.x, frame.y - peer.y, frame.z - peer.z);
    const isInBounds =
      frame.x >= SPACE_BOUNDS.minX &&
      frame.x <= SPACE_BOUNDS.maxX &&
      frame.z >= SPACE_BOUNDS.minZ &&
      frame.z <= SPACE_BOUNDS.maxZ &&
      // 섬 전체 높이 상한만 봄. 서버는 지형을 몰라 층별 판정은
      // 클라이언트 지형 충돌이 맡음.
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
   * 닉네임을 바꾸고 모두에게 알림.
   *
   * `peer` 프레임은 좌표까지 담겨 본인에게도 그대로 보냄. 수신 쪽은
   * 좌표가 그대로면 위치를 되감지 않음.
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
   * 아바타 모델을 바꿈.
   *
   * 닉네임과 같은 흐름. 다만 **쿨다운 없음**. 이름은 자주 바뀌면
   * 누가 누군지 못 따라가지만, 모델은 그 사람의 좌석·색·이름이 그대로라 혼동이
   * 안 생김. 프레임 수 제한(초당 40)이 이미 연타를 막음.
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
      if (this.isIpSayLimitReached(attachment.ipGuardKey, now)) {
        this.sendError(
          socket,
          "RATE_SAY_MINUTE",
          "잠시 동안 메시지를 너무 많이 보냈어요. 조금 뒤에 다시 보내 주세요.",
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
      this.appendChatHistory(message);
      this.recordIpSay(attachment.ipGuardKey, now);
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
