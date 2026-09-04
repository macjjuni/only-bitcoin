import { DurableObject } from "cloudflare:workers";
import {
  deriveDailyActor,
  deriveReactionActorToken,
  deriveSayActorTag,
  deriveStableActorKey,
  getKoreaDate,
  getNextKoreaMidnight,
  issuePassToken,
  verifyPassToken,
} from "./lib/crypto";
import { parseClientFrame } from "./lib/protocol";
import {
  ChatValidationError,
  createReplySnippet,
  normalizeChatMessage,
  normalizeNickname,
} from "./lib/textValidation";
import {
  type ActorStateRow,
  CHAT_PROTOCOL_VERSION,
  type ChatMessageParent,
  type ChatReactionCounts,
  type ChatReactionKey,
  type ChatWireMessage,
  type ChatWorkerEnv,
  type ClientFrame,
  type MessageRow,
  type ReactionState,
  type SocketAttachment,
  type StoredChatMessage,
} from "./types";

interface NickRequestRecord {
  rid: string;
  nickname: string;
  createdAt: number;
}

interface NickRequestState {
  recentRequests: NickRequestRecord[];
}

interface RoomState {
  readOnly: boolean;
  reasonCode?: string;
}

interface TurnstileSiteverifyResponse {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
}

const MAXIMUM_STORED_MESSAGE_COUNT = 300;
const INITIAL_MESSAGE_COUNT = 50;
const MORE_MESSAGE_COUNT = 50;
const MAXIMUM_ROOM_CONNECTION_COUNT = 500;
const MAXIMUM_PENDING_JOIN_COUNT = 100;
const MAXIMUM_IP_CONNECTION_COUNT = 20;
const MAXIMUM_ACTOR_CONNECTION_COUNT = 3;
const JOIN_DEADLINE_IN_MILLISECONDS = 10_000;
const REACTION_BROADCAST_WINDOW_IN_MILLISECONDS = 1_000;
const ONLINE_BROADCAST_WINDOW_IN_MILLISECONDS = 500;
const ACTOR_STATE_RETENTION_IN_MILLISECONDS = 24 * 60 * 60 * 1_000;
const NICKNAME_CHANGE_INTERVAL_IN_MILLISECONDS = 5 * 60 * 1_000;
const SAY_INTERVAL_IN_MILLISECONDS = 3_000;
const SAY_WINDOW_IN_MILLISECONDS = 60_000;
const REACTION_WINDOW_IN_MILLISECONDS = 1_000;
const MORE_INTERVAL_IN_MILLISECONDS = 1_000;
const REQUEST_ID_RETENTION_IN_MILLISECONDS = 10 * 60 * 1_000;
const MAXIMUM_RECENT_REQUEST_COUNT = 64;

const REACTION_BITS: Record<ChatReactionKey, number> = {
  rocket: 1,
  fear: 2,
  diamond: 4,
  up: 8,
};

const EMPTY_REACTION_COUNTS: ChatReactionCounts = {
  rocket: 0,
  fear: 0,
  diamond: 0,
  up: 0,
};

// region [Privates]
const createEmptyReactionState = (): ReactionState => ({
  actors: [],
  recentRequests: [],
  counts: { ...EMPTY_REACTION_COUNTS },
});

const isSocketAttachment = (value: unknown): value is SocketAttachment => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const attachment = value as Partial<SocketAttachment>;
  return (
    attachment.v === CHAT_PROTOCOL_VERSION &&
    typeof attachment.joined === "boolean" &&
    typeof attachment.ipGuardKey === "string" &&
    typeof attachment.protocolViolations === "number"
  );
};

const parseJsonOrNull = <Value>(rawValue: string | null): Value | null => {
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as Value;
  } catch {
    return null;
  }
};

const parseReactionState = (rawValue: string): ReactionState => {
  const parsedState = parseJsonOrNull<ReactionState>(rawValue);

  if (
    !parsedState ||
    !Array.isArray(parsedState.actors) ||
    !Array.isArray(parsedState.recentRequests) ||
    typeof parsedState.counts !== "object" ||
    parsedState.counts === null
  ) {
    return createEmptyReactionState();
  }

  const hasValidCounts = Object.keys(EMPTY_REACTION_COUNTS).every((reactionKey) => {
    const count = parsedState.counts[reactionKey as ChatReactionKey];
    return Number.isInteger(count) && count >= 0 && count <= 99;
  });

  return hasValidCounts ? parsedState : createEmptyReactionState();
};

const messageRowToStoredMessage = (messageRow: MessageRow): StoredChatMessage => {
  const parent = parseJsonOrNull<ChatMessageParent>(messageRow.parent_json);
  return {
    id: String(messageRow.id),
    anonId: messageRow.anon_id,
    nickname: messageRow.nickname,
    body: messageRow.body,
    parent: parent ?? undefined,
    reactions: parseReactionState(messageRow.reaction_state).counts,
    createdAt: messageRow.created_at,
    sayActorTag: messageRow.say_actor_tag,
    requestId: messageRow.request_id,
    reactionState: parseReactionState(messageRow.reaction_state),
  };
};

const compareMessageIds = (leftMessageId: string, rightMessageId: string): number => {
  const leftId = BigInt(leftMessageId);
  const rightId = BigInt(rightMessageId);
  return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
};

const jsonResponse = (payload: unknown, status = 200): Response => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

const getErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    RATE_SAY_INTERVAL: "메시지는 3초에 한 번 보낼 수 있어요.",
    RATE_SAY_MINUTE: "잠시 동안 메시지를 너무 많이 보냈어요.",
    DUPLICATE_BODY: "같은 메시지를 연속해서 보낼 수 없어요.",
    RATE_NICK: "닉네임은 5분에 한 번 바꿀 수 있어요.",
    RATE_REACTION: "반응을 너무 빠르게 누르고 있어요.",
    RATE_MORE: "이전 메시지는 잠시 후 다시 불러와 주세요.",
    TURNSTILE_REQUIRED: "글이나 반응을 남기려면 봇 확인이 필요해요.",
    TURNSTILE_FAILED: "봇 확인에 실패했어요. 다시 시도해 주세요.",
    TURNSTILE_UNAVAILABLE: "봇 확인을 사용할 수 없어 지금은 읽기만 가능해요.",
    REACTION_CAPACITY: "이 메시지는 99명이 반응해 더 이상 새로 참여할 수 없어요.",
    MESSAGE_NOT_FOUND: "메시지를 찾을 수 없어요.",
    READ_ONLY: "현재 채팅은 읽기 전용이에요.",
    PROTOCOL_ERROR: "채팅 요청 형식이 올바르지 않아요.",
    INTERNAL_ERROR: "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
  };

  return errorMessages[errorCode] ?? "요청을 처리할 수 없어요.";
};
// endregion

export class ChatRoom extends DurableObject<ChatWorkerEnv> {
  private isSchemaInitialized = false;
  private messagesLoadPromise: Promise<void> | null = null;
  private messagesById = new Map<string, StoredChatMessage>();
  private messageIds: string[] = [];
  private sayTimestampsByActorTag = new Map<string, number[]>();
  private lastSayTimestampByActor = new Map<string, number>();
  private lastSuccessfulBodyByActor = new Map<string, string>();
  private reactionTimestampsByActor = new Map<string, number[]>();
  private lastMoreTimestampByActor = new Map<string, number>();
  private joinDeadlineTimers = new Map<WebSocket, ReturnType<typeof setTimeout>>();
  private dirtyReactionCountsByMessageId = new Map<string, ChatReactionCounts>();
  private reactionBroadcastTimer: ReturnType<typeof setTimeout> | null = null;
  private onlineBroadcastTimer: ReturnType<typeof setTimeout> | null = null;
  private roomState: RoomState | null = null;

  constructor(
    private readonly state: DurableObjectState,
    private readonly workerEnv: ChatWorkerEnv,
  ) {
    super(state, workerEnv);

    for (const socket of this.state.getWebSockets()) {
      const attachment = socket.deserializeAttachment();

      if (isSocketAttachment(attachment) && !attachment.joined && attachment.joinDeadlineAt) {
        this.scheduleJoinDeadline(socket, attachment.joinDeadlineAt);
      }
    }
  }

  // region [Privates]
  private ensureSchema(): void {
    if (this.isSchemaInitialized) {
      return;
    }

    this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        anon_id TEXT NOT NULL,
        nickname TEXT NOT NULL,
        body TEXT NOT NULL,
        parent_json TEXT,
        reaction_state TEXT NOT NULL,
        say_actor_tag TEXT NOT NULL,
        request_id TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS actor_state (
        stable_key TEXT PRIMARY KEY,
        nickname TEXT NOT NULL,
        nickname_changed_at INTEGER NOT NULL,
        nick_request_state TEXT NOT NULL,
        daily_actor_key TEXT NOT NULL,
        last_activity_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled INTEGER NOT NULL,
        reason_code TEXT,
        updated_at INTEGER NOT NULL
      );
    `);
    this.isSchemaInitialized = true;
  }

  private async ensureMessagesLoaded(): Promise<void> {
    if (this.messagesLoadPromise) {
      return this.messagesLoadPromise;
    }

    this.messagesLoadPromise = Promise.resolve().then(() => {
      this.ensureSchema();
      const messageRows = this.state.storage.sql
        .exec<MessageRow>(
          `SELECT id, anon_id, nickname, body, parent_json, reaction_state,
                  say_actor_tag, request_id, created_at
             FROM messages
            ORDER BY id DESC
            LIMIT ?`,
          MAXIMUM_STORED_MESSAGE_COUNT,
        )
        .toArray()
        .reverse();
      const nextMessagesById = new Map<string, StoredChatMessage>();
      const nextMessageIds: string[] = [];
      const nextSayTimestampsByActorTag = new Map<string, number[]>();
      const minimumSayTimestamp = Date.now() - SAY_WINDOW_IN_MILLISECONDS;

      for (const messageRow of messageRows) {
        const storedMessage = messageRowToStoredMessage(messageRow);
        nextMessagesById.set(storedMessage.id, storedMessage);
        nextMessageIds.push(storedMessage.id);

        if (storedMessage.createdAt >= minimumSayTimestamp) {
          const currentTimestamps =
            nextSayTimestampsByActorTag.get(storedMessage.sayActorTag) ?? [];
          currentTimestamps.push(storedMessage.createdAt);
          nextSayTimestampsByActorTag.set(storedMessage.sayActorTag, currentTimestamps);
        }
      }

      this.messagesById = nextMessagesById;
      this.messageIds = nextMessageIds;
      this.sayTimestampsByActorTag = nextSayTimestampsByActorTag;
    });

    try {
      await this.messagesLoadPromise;
    } catch (error) {
      this.messagesLoadPromise = null;
      this.messagesById = new Map();
      this.messageIds = [];
      this.sayTimestampsByActorTag = new Map();
      throw error;
    }
  }

  private async getRoomState(): Promise<RoomState> {
    if (this.roomState) {
      return this.roomState;
    }

    this.ensureSchema();
    const settingsRow = this.state.storage.sql
      .exec<{ enabled: number; reason_code: string | null }>(
        "SELECT enabled, reason_code FROM settings WHERE id = 1",
      )
      .toArray()[0];
    this.roomState = {
      readOnly: settingsRow?.enabled === 1,
      reasonCode: settingsRow?.reason_code ?? undefined,
    };
    return this.roomState;
  }

  private getAttachment(socket: WebSocket): SocketAttachment | null {
    const attachment = socket.deserializeAttachment();
    return isSocketAttachment(attachment) ? attachment : null;
  }

  private getJoinedSockets(): WebSocket[] {
    return this.state.getWebSockets().filter((socket) => {
      const attachment = this.getAttachment(socket);
      return socket.readyState === WebSocket.OPEN && attachment?.joined === true;
    });
  }

  private getOnlineActorCount(): number {
    const stableActorKeys = new Set<string>();

    for (const socket of this.getJoinedSockets()) {
      const stableActorKey = this.getAttachment(socket)?.stableActorKey;

      if (stableActorKey) {
        stableActorKeys.add(stableActorKey);
      }
    }

    return stableActorKeys.size;
  }

  private sendFrame(socket: WebSocket, frame: object): void {
    try {
      socket.send(JSON.stringify(frame));
    } catch {
      try {
        socket.close(1011, "send failed");
      } catch {
        // 이미 닫힌 개별 socket은 전체 팬아웃 결과에 영향을 주지 않는다.
      }
    }
  }

  private broadcastFrame(frame: object): void {
    for (const socket of this.getJoinedSockets()) {
      this.sendFrame(socket, frame);
    }
  }

  private sendError(
    socket: WebSocket,
    code: string,
    requestId?: string,
    retryAfterInMilliseconds?: number,
  ): void {
    this.sendFrame(socket, {
      v: CHAT_PROTOCOL_VERSION,
      t: "err",
      rid: requestId,
      code,
      message: getErrorMessage(code),
      retryAfterMs: retryAfterInMilliseconds,
    });
  }

  private recordProtocolViolation(socket: WebSocket, shouldCloseImmediately = false): void {
    const attachment = this.getAttachment(socket);

    if (!attachment) {
      socket.close(1008, "invalid attachment");
      return;
    }

    const nextAttachment = {
      ...attachment,
      protocolViolations: attachment.protocolViolations + 1,
    };
    socket.serializeAttachment(nextAttachment);
    this.sendError(socket, "PROTOCOL_ERROR");

    if (shouldCloseImmediately || nextAttachment.protocolViolations >= 3) {
      socket.close(1008, "protocol violation");
    }
  }

  private scheduleJoinDeadline(socket: WebSocket, joinDeadlineAt: number): void {
    const remainingTimeInMilliseconds = Math.max(0, joinDeadlineAt - Date.now());
    const existingTimer = this.joinDeadlineTimers.get(socket);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const deadlineTimer = setTimeout(() => {
      const attachment = this.getAttachment(socket);

      if (attachment && !attachment.joined) {
        socket.close(4009, "join timeout");
      }
      this.joinDeadlineTimers.delete(socket);
    }, remainingTimeInMilliseconds);
    this.joinDeadlineTimers.set(socket, deadlineTimer);
  }

  private clearJoinDeadline(socket: WebSocket): void {
    const deadlineTimer = this.joinDeadlineTimers.get(socket);

    if (deadlineTimer) {
      clearTimeout(deadlineTimer);
      this.joinDeadlineTimers.delete(socket);
    }
  }

  private scheduleOnlineBroadcast(): void {
    if (this.onlineBroadcastTimer) {
      return;
    }

    this.onlineBroadcastTimer = setTimeout(() => {
      this.onlineBroadcastTimer = null;
      this.broadcastFrame({
        v: CHAT_PROTOCOL_VERSION,
        t: "online",
        n: this.getOnlineActorCount(),
      });
    }, ONLINE_BROADCAST_WINDOW_IN_MILLISECONDS);
  }

  private scheduleReactionBroadcast(): void {
    if (this.reactionBroadcastTimer) {
      return;
    }

    this.reactionBroadcastTimer = setTimeout(() => {
      const updates = Array.from(this.dirtyReactionCountsByMessageId, ([id, reactions]) => ({
        id,
        reactions,
      }));
      this.reactionBroadcastTimer = null;
      this.dirtyReactionCountsByMessageId.clear();

      if (updates.length > 0) {
        this.broadcastFrame({ v: CHAT_PROTOCOL_VERSION, t: "react", updates });
      }
    }, REACTION_BROADCAST_WINDOW_IN_MILLISECONDS);
  }

  private async scheduleNextMidnightAlarm(): Promise<void> {
    const nextMidnightAt = getNextKoreaMidnight(Date.now());
    const currentAlarm = await this.state.storage.getAlarm();

    if (currentAlarm !== nextMidnightAt) {
      await this.state.storage.setAlarm(nextMidnightAt);
    }
  }

  private getMessageForActor(
    message: StoredChatMessage,
    stableActorKey: string,
  ): Promise<ChatWireMessage> {
    return deriveReactionActorToken(message.id, stableActorKey).then((reactionActorToken) => {
      const actorMask =
        message.reactionState.actors.find(({ token }) => token === reactionActorToken)?.mask ?? 0;
      const myReactions = (Object.entries(REACTION_BITS) as Array<[ChatReactionKey, number]>)
        .filter(([, reactionBit]) => (actorMask & reactionBit) !== 0)
        .map(([reactionKey]) => reactionKey);

      return {
        id: message.id,
        anonId: message.anonId,
        nickname: message.nickname,
        body: message.body,
        parent: message.parent,
        reactions: message.reactionState.counts,
        myReactions,
        createdAt: message.createdAt,
      };
    });
  }

  private getPublicMessage(message: StoredChatMessage): ChatWireMessage {
    return {
      id: message.id,
      anonId: message.anonId,
      nickname: message.nickname,
      body: message.body,
      parent: message.parent,
      reactions: message.reactionState.counts,
      createdAt: message.createdAt,
    };
  }

  private async getMessagesForActor(
    messageIds: readonly string[],
    stableActorKey: string,
  ): Promise<ChatWireMessage[]> {
    const storedMessages = messageIds
      .map((messageId) => this.messagesById.get(messageId))
      .filter((message): message is StoredChatMessage => Boolean(message));
    return Promise.all(
      storedMessages.map((message) => this.getMessageForActor(message, stableActorKey)),
    );
  }

  private getActorState(stableActorKey: string): ActorStateRow | undefined {
    this.ensureSchema();
    return this.state.storage.sql
      .exec<ActorStateRow>(
        `SELECT stable_key, nickname, nickname_changed_at, nick_request_state,
                daily_actor_key, last_activity_at
           FROM actor_state
          WHERE stable_key = ?`,
        stableActorKey,
      )
      .toArray()[0];
  }

  private writeActorState(
    stableActorKey: string,
    nickname: string,
    nicknameChangedAt: number,
    nickRequestState: NickRequestState,
    dailyActorKey: string,
    lastActivityAt: number,
  ): void {
    this.state.storage.sql.exec(
      `INSERT INTO actor_state (
         stable_key, nickname, nickname_changed_at, nick_request_state,
         daily_actor_key, last_activity_at
       ) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(stable_key) DO UPDATE SET
         nickname = excluded.nickname,
         nickname_changed_at = excluded.nickname_changed_at,
         nick_request_state = excluded.nick_request_state,
         daily_actor_key = excluded.daily_actor_key,
         last_activity_at = excluded.last_activity_at`,
      stableActorKey,
      nickname,
      nicknameChangedAt,
      JSON.stringify(nickRequestState),
      dailyActorKey,
      lastActivityAt,
    );
  }

  private requireJoinedAttachment(socket: WebSocket): SocketAttachment | null {
    const attachment = this.getAttachment(socket);

    if (
      !attachment?.joined ||
      !attachment.stableActorKey ||
      !attachment.dailyActorKey ||
      !attachment.anonId ||
      !attachment.nickname
    ) {
      this.recordProtocolViolation(socket);
      return null;
    }

    return attachment;
  }

  private hasValidWritePass(attachment: SocketAttachment): boolean {
    return Boolean(attachment.verifiedUntil && attachment.verifiedUntil > Date.now());
  }

  private async handleJoin(socket: WebSocket, frame: Extract<ClientFrame, { t: "join" }>) {
    const initialAttachment = this.getAttachment(socket);

    if (!initialAttachment || initialAttachment.joined) {
      this.recordProtocolViolation(socket);
      return;
    }

    await this.ensureMessagesLoaded();
    const currentTime = Date.now();
    const stableActorKey = await deriveStableActorKey(
      this.workerEnv.ENFORCEMENT_SECRET,
      frame.clientKey,
    );
    const existingActorConnectionCount = this.getJoinedSockets().filter((joinedSocket) => {
      return this.getAttachment(joinedSocket)?.stableActorKey === stableActorKey;
    }).length;

    if (existingActorConnectionCount >= MAXIMUM_ACTOR_CONNECTION_COUNT) {
      socket.close(4008, "actor connection limit");
      return;
    }

    const koreaDate = getKoreaDate(currentTime);
    const { dailyActorKey, anonId } = await deriveDailyActor(
      this.workerEnv.ACTOR_SECRET,
      koreaDate,
      stableActorKey,
    );
    const actorState = this.getActorState(stableActorKey);
    let requestedNickname = "익명";

    try {
      requestedNickname = normalizeNickname(frame.nickname);
    } catch {
      requestedNickname = "익명";
    }

    let nickname = actorState?.nickname ?? requestedNickname;
    let nicknameChangedAt = actorState?.nickname_changed_at ?? currentTime;
    const nickRequestState = parseJsonOrNull<NickRequestState>(
      actorState?.nick_request_state ?? null,
    ) ?? {
      recentRequests: [],
    };

    if (
      actorState &&
      actorState.nickname !== requestedNickname &&
      currentTime - actorState.nickname_changed_at >= NICKNAME_CHANGE_INTERVAL_IN_MILLISECONDS
    ) {
      nickname = requestedNickname;
      nicknameChangedAt = currentTime;
    }

    const signingSecrets = [
      this.workerEnv.PASS_SIGNING_SECRET,
      this.workerEnv.PASS_SIGNING_SECRET_PREVIOUS ?? "",
    ];
    const verifiedUntil = await verifyPassToken(
      frame.passToken,
      signingSecrets,
      stableActorKey,
      currentTime,
    );
    this.writeActorState(
      stableActorKey,
      nickname,
      nicknameChangedAt,
      nickRequestState,
      dailyActorKey,
      currentTime,
    );

    const joinedAttachment: SocketAttachment = {
      ...initialAttachment,
      joined: true,
      joinDeadlineAt: undefined,
      stableActorKey,
      dailyActorKey,
      anonId,
      nickname,
      verifiedUntil: verifiedUntil ?? undefined,
    };
    socket.serializeAttachment(joinedAttachment);
    this.clearJoinDeadline(socket);

    const initialMessageIds = this.messageIds.slice(-INITIAL_MESSAGE_COUNT);
    const messages = await this.getMessagesForActor(initialMessageIds, stableActorKey);
    const roomState = await this.getRoomState();
    this.sendFrame(socket, {
      v: CHAT_PROTOCOL_VERSION,
      t: "init",
      messages,
      me: { anonId, nickname, verifiedUntil: verifiedUntil ?? undefined },
      online: this.getOnlineActorCount(),
      readOnly: roomState.readOnly,
      reasonCode: roomState.reasonCode,
      serverTime: currentTime,
      hasMore: this.messageIds.length > INITIAL_MESSAGE_COUNT,
    });
    this.scheduleOnlineBroadcast();
    await this.scheduleNextMidnightAlarm();
  }

  private async handleSay(socket: WebSocket, frame: Extract<ClientFrame, { t: "say" }>) {
    const attachment = this.requireJoinedAttachment(socket);

    if (!attachment?.stableActorKey || !attachment.anonId || !attachment.nickname) {
      return;
    }
    if (!this.hasValidWritePass(attachment)) {
      this.sendError(socket, "TURNSTILE_REQUIRED", frame.rid);
      return;
    }

    const roomState = await this.getRoomState();
    if (roomState.readOnly) {
      this.sendError(socket, "READ_ONLY", frame.rid);
      return;
    }

    await this.ensureMessagesLoaded();
    const duplicateMessage = Array.from(this.messagesById.values()).find((message) => {
      return message.requestId === frame.rid;
    });

    if (duplicateMessage) {
      this.sendFrame(socket, {
        v: CHAT_PROTOCOL_VERSION,
        t: "ack",
        rid: frame.rid,
        action: "say",
        id: duplicateMessage.id,
      });
      return;
    }

    const normalizedBody = normalizeChatMessage(frame.body);
    const currentTime = Date.now();
    const lastSayTimestamp = this.lastSayTimestampByActor.get(attachment.stableActorKey) ?? 0;

    if (currentTime - lastSayTimestamp < SAY_INTERVAL_IN_MILLISECONDS) {
      this.sendError(
        socket,
        "RATE_SAY_INTERVAL",
        frame.rid,
        SAY_INTERVAL_IN_MILLISECONDS - (currentTime - lastSayTimestamp),
      );
      return;
    }
    if (this.lastSuccessfulBodyByActor.get(attachment.stableActorKey) === normalizedBody) {
      this.sendError(socket, "DUPLICATE_BODY", frame.rid);
      return;
    }

    const sayBucket = Math.floor(currentTime / 300_000);
    const [currentSayActorTag, previousSayActorTag] = await Promise.all([
      deriveSayActorTag(this.workerEnv.ENFORCEMENT_SECRET, sayBucket, attachment.stableActorKey),
      deriveSayActorTag(
        this.workerEnv.ENFORCEMENT_SECRET,
        sayBucket - 1,
        attachment.stableActorKey,
      ),
    ]);
    const minimumTimestamp = currentTime - SAY_WINDOW_IN_MILLISECONDS;
    const recentSayTimestamps = [currentSayActorTag, previousSayActorTag].flatMap((sayActorTag) => {
      return (this.sayTimestampsByActorTag.get(sayActorTag) ?? []).filter(
        (timestamp) => timestamp > minimumTimestamp,
      );
    });

    if (recentSayTimestamps.length >= 10) {
      this.sendError(socket, "RATE_SAY_MINUTE", frame.rid);
      return;
    }

    const parentMessage = frame.parentId ? this.messagesById.get(frame.parentId) : undefined;
    const parentSnapshot: ChatMessageParent | undefined = parentMessage
      ? {
          id: parentMessage.id,
          anonId: parentMessage.anonId,
          nickname: parentMessage.nickname,
          snippet: createReplySnippet(parentMessage.body),
        }
      : undefined;
    const reactionState = createEmptyReactionState();
    const messageId = this.state.storage.transactionSync(() => {
      const insertedRow = this.state.storage.sql
        .exec<{ id: number }>(
          `INSERT INTO messages (
             anon_id, nickname, body, parent_json, reaction_state,
             say_actor_tag, request_id, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           RETURNING id`,
          attachment.anonId,
          attachment.nickname,
          normalizedBody,
          parentSnapshot ? JSON.stringify(parentSnapshot) : null,
          JSON.stringify(reactionState),
          currentSayActorTag,
          frame.rid,
          currentTime,
        )
        .one();
      this.state.storage.sql.exec(
        `DELETE FROM messages
          WHERE id NOT IN (
            SELECT id FROM messages ORDER BY id DESC LIMIT ?
          )`,
        MAXIMUM_STORED_MESSAGE_COUNT,
      );
      return String(insertedRow.id);
    });
    const storedMessage: StoredChatMessage = {
      id: messageId,
      anonId: attachment.anonId,
      nickname: attachment.nickname,
      body: normalizedBody,
      parent: parentSnapshot,
      reactions: reactionState.counts,
      createdAt: currentTime,
      sayActorTag: currentSayActorTag,
      requestId: frame.rid,
      reactionState,
    };
    this.messagesById.set(messageId, storedMessage);
    this.messageIds.push(messageId);

    while (this.messageIds.length > MAXIMUM_STORED_MESSAGE_COUNT) {
      const removedMessageId = this.messageIds.shift();
      if (removedMessageId) {
        this.messagesById.delete(removedMessageId);
      }
    }

    const currentTagTimestamps = (
      this.sayTimestampsByActorTag.get(currentSayActorTag) ?? []
    ).filter((timestamp) => timestamp > minimumTimestamp);
    currentTagTimestamps.push(currentTime);
    this.sayTimestampsByActorTag.set(currentSayActorTag, currentTagTimestamps);
    this.lastSayTimestampByActor.set(attachment.stableActorKey, currentTime);
    this.lastSuccessfulBodyByActor.set(attachment.stableActorKey, normalizedBody);
    this.broadcastFrame({
      v: CHAT_PROTOCOL_VERSION,
      t: "msg",
      message: this.getPublicMessage(storedMessage),
    });
    this.sendFrame(socket, {
      v: CHAT_PROTOCOL_VERSION,
      t: "ack",
      rid: frame.rid,
      action: "say",
      id: messageId,
      parentDetached: Boolean(frame.parentId && !parentMessage),
    });
  }

  private async handleReaction(socket: WebSocket, frame: Extract<ClientFrame, { t: "react" }>) {
    const attachment = this.requireJoinedAttachment(socket);

    if (!attachment?.stableActorKey) {
      return;
    }
    if (!this.hasValidWritePass(attachment)) {
      this.sendError(socket, "TURNSTILE_REQUIRED", frame.rid);
      return;
    }

    await this.ensureMessagesLoaded();
    const storedMessage = this.messagesById.get(frame.id);

    if (!storedMessage) {
      this.sendError(socket, "MESSAGE_NOT_FOUND", frame.rid);
      return;
    }

    const currentTime = Date.now();
    const minimumReactionTimestamp = currentTime - REACTION_WINDOW_IN_MILLISECONDS;
    const recentReactionTimestamps = (
      this.reactionTimestampsByActor.get(attachment.stableActorKey) ?? []
    ).filter((timestamp) => timestamp > minimumReactionTimestamp);

    if (recentReactionTimestamps.length >= 5) {
      this.sendError(socket, "RATE_REACTION", frame.rid);
      return;
    }

    const reactionActorToken = await deriveReactionActorToken(
      storedMessage.id,
      attachment.stableActorKey,
    );
    const duplicateRequest = storedMessage.reactionState.recentRequests.find((requestRecord) => {
      return requestRecord.rid === frame.rid && requestRecord.actorToken === reactionActorToken;
    });

    if (duplicateRequest) {
      this.sendFrame(socket, {
        v: CHAT_PROTOCOL_VERSION,
        t: "ack",
        rid: frame.rid,
        action: "react",
        reaction: {
          id: storedMessage.id,
          key: duplicateRequest.key,
          active: duplicateRequest.active,
        },
      });
      return;
    }

    const nextReactionState: ReactionState = JSON.parse(
      JSON.stringify(storedMessage.reactionState),
    ) as ReactionState;
    const currentActorEntry = nextReactionState.actors.find(
      ({ token }) => token === reactionActorToken,
    );

    if (!currentActorEntry && nextReactionState.actors.length >= 99) {
      this.sendError(socket, "REACTION_CAPACITY", frame.rid);
      return;
    }

    const reactionBit = REACTION_BITS[frame.key];
    const previousMask = currentActorEntry?.mask ?? 0;
    const isActive = (previousMask & reactionBit) === 0;
    const nextMask = isActive ? previousMask | reactionBit : previousMask & ~reactionBit;
    nextReactionState.counts[frame.key] += isActive ? 1 : -1;

    if (currentActorEntry) {
      if (nextMask === 0) {
        nextReactionState.actors = nextReactionState.actors.filter(
          ({ token }) => token !== reactionActorToken,
        );
      } else {
        currentActorEntry.mask = nextMask;
      }
    } else {
      nextReactionState.actors.push({ token: reactionActorToken, mask: nextMask });
    }

    nextReactionState.recentRequests = nextReactionState.recentRequests
      .filter((requestRecord) => {
        return requestRecord.createdAt > currentTime - REQUEST_ID_RETENTION_IN_MILLISECONDS;
      })
      .slice(-(MAXIMUM_RECENT_REQUEST_COUNT - 1));
    nextReactionState.recentRequests.push({
      rid: frame.rid,
      actorToken: reactionActorToken,
      key: frame.key,
      active: isActive,
      createdAt: currentTime,
    });
    this.state.storage.sql.exec(
      "UPDATE messages SET reaction_state = ? WHERE id = ?",
      JSON.stringify(nextReactionState),
      Number(storedMessage.id),
    );

    const nextStoredMessage: StoredChatMessage = {
      ...storedMessage,
      reactions: nextReactionState.counts,
      reactionState: nextReactionState,
    };
    this.messagesById.set(storedMessage.id, nextStoredMessage);
    recentReactionTimestamps.push(currentTime);
    this.reactionTimestampsByActor.set(attachment.stableActorKey, recentReactionTimestamps);
    this.sendFrame(socket, {
      v: CHAT_PROTOCOL_VERSION,
      t: "ack",
      rid: frame.rid,
      action: "react",
      reaction: { id: storedMessage.id, key: frame.key, active: isActive },
    });
    this.dirtyReactionCountsByMessageId.set(storedMessage.id, nextReactionState.counts);
    this.scheduleReactionBroadcast();
  }

  private async handleNickname(socket: WebSocket, frame: Extract<ClientFrame, { t: "nick" }>) {
    const attachment = this.requireJoinedAttachment(socket);

    if (!attachment?.stableActorKey || !attachment.dailyActorKey || !attachment.anonId) {
      return;
    }
    if (!this.hasValidWritePass(attachment)) {
      this.sendError(socket, "TURNSTILE_REQUIRED", frame.rid);
      return;
    }

    const nickname = normalizeNickname(frame.nickname);
    const currentTime = Date.now();
    const actorState = this.getActorState(attachment.stableActorKey);
    const currentRequestState = parseJsonOrNull<NickRequestState>(
      actorState?.nick_request_state ?? null,
    ) ?? {
      recentRequests: [],
    };
    const duplicateRequest = currentRequestState.recentRequests.find((requestRecord) => {
      return requestRecord.rid === frame.rid;
    });

    if (duplicateRequest) {
      this.sendFrame(socket, {
        v: CHAT_PROTOCOL_VERSION,
        t: "ack",
        rid: frame.rid,
        action: "nick",
      });
      return;
    }

    if (
      actorState &&
      currentTime - actorState.nickname_changed_at < NICKNAME_CHANGE_INTERVAL_IN_MILLISECONDS
    ) {
      this.sendError(
        socket,
        "RATE_NICK",
        frame.rid,
        NICKNAME_CHANGE_INTERVAL_IN_MILLISECONDS - (currentTime - actorState.nickname_changed_at),
      );
      return;
    }

    const recentRequests = currentRequestState.recentRequests
      .filter((requestRecord) => {
        return requestRecord.createdAt > currentTime - REQUEST_ID_RETENTION_IN_MILLISECONDS;
      })
      .slice(-(MAXIMUM_RECENT_REQUEST_COUNT - 1));
    recentRequests.push({ rid: frame.rid, nickname, createdAt: currentTime });
    this.writeActorState(
      attachment.stableActorKey,
      nickname,
      currentTime,
      { recentRequests },
      attachment.dailyActorKey,
      currentTime,
    );

    const nextAttachment = { ...attachment, nickname };
    socket.serializeAttachment(nextAttachment);
    const me = {
      anonId: attachment.anonId,
      nickname,
      verifiedUntil: attachment.verifiedUntil,
    };
    this.sendFrame(socket, { v: CHAT_PROTOCOL_VERSION, t: "nick", me });
    this.sendFrame(socket, {
      v: CHAT_PROTOCOL_VERSION,
      t: "ack",
      rid: frame.rid,
      action: "nick",
    });
  }

  private async handleMore(socket: WebSocket, frame: Extract<ClientFrame, { t: "more" }>) {
    const attachment = this.requireJoinedAttachment(socket);

    if (!attachment?.stableActorKey) {
      return;
    }

    const currentTime = Date.now();
    const lastMoreTimestamp = this.lastMoreTimestampByActor.get(attachment.stableActorKey) ?? 0;
    if (currentTime - lastMoreTimestamp < MORE_INTERVAL_IN_MILLISECONDS) {
      this.sendError(socket, "RATE_MORE", frame.rid, MORE_INTERVAL_IN_MILLISECONDS);
      return;
    }

    await this.ensureMessagesLoaded();
    const olderMessageIds = this.messageIds.filter((messageId) => {
      return compareMessageIds(messageId, frame.beforeId) < 0;
    });
    const responseMessageIds = olderMessageIds.slice(-MORE_MESSAGE_COUNT);
    const messages = await this.getMessagesForActor(responseMessageIds, attachment.stableActorKey);
    this.lastMoreTimestampByActor.set(attachment.stableActorKey, currentTime);
    this.sendFrame(socket, {
      v: CHAT_PROTOCOL_VERSION,
      t: "more",
      rid: frame.rid,
      messages,
      hasMore: olderMessageIds.length > MORE_MESSAGE_COUNT,
    });
  }

  private async verifyTurnstileWithRetry(
    token: string,
    requestId: string,
  ): Promise<TurnstileSiteverifyResponse | null> {
    const requestBody = new FormData();
    requestBody.set("secret", this.workerEnv.TURNSTILE_SECRET_KEY);
    requestBody.set("response", token);
    requestBody.set("idempotency_key", requestId);

    for (let attemptIndex = 0; attemptIndex < 2; attemptIndex += 1) {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 5_000);

      try {
        const siteverifyResponse = await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          {
            method: "POST",
            body: requestBody,
            signal: abortController.signal,
          },
        );

        if (siteverifyResponse.ok) {
          return (await siteverifyResponse.json()) as TurnstileSiteverifyResponse;
        }
        if (siteverifyResponse.status < 500) {
          return { success: false };
        }
      } catch {
        // timeout과 일시적 네트워크 실패는 같은 idempotency key로 한 번만 재시도한다.
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return null;
  }

  private async handleVerify(socket: WebSocket, frame: Extract<ClientFrame, { t: "verify" }>) {
    const attachment = this.requireJoinedAttachment(socket);

    if (!attachment?.stableActorKey) {
      return;
    }
    if (frame.token.length > 4096) {
      this.sendError(socket, "TURNSTILE_FAILED", frame.rid);
      return;
    }

    const verificationResult = await this.verifyTurnstileWithRetry(frame.token, frame.rid);

    if (!verificationResult) {
      this.sendError(socket, "TURNSTILE_UNAVAILABLE", frame.rid);
      return;
    }
    if (
      verificationResult.success !== true ||
      verificationResult.hostname !== this.workerEnv.TURNSTILE_EXPECTED_HOSTNAME ||
      verificationResult.action !== "chat_write"
    ) {
      this.sendError(socket, "TURNSTILE_FAILED", frame.rid);
      return;
    }

    const { passToken, expiresAt } = await issuePassToken(
      this.workerEnv.PASS_SIGNING_SECRET,
      attachment.stableActorKey,
      Date.now(),
    );
    socket.serializeAttachment({ ...attachment, verifiedUntil: expiresAt });
    this.sendFrame(socket, {
      v: CHAT_PROTOCOL_VERSION,
      t: "ack",
      rid: frame.rid,
      action: "verify",
      passToken,
    });
  }

  private async handleJoinedFrame(socket: WebSocket, frame: Exclude<ClientFrame, { t: "join" }>) {
    switch (frame.t) {
      case "say":
        await this.handleSay(socket, frame);
        return;
      case "react":
        await this.handleReaction(socket, frame);
        return;
      case "nick":
        await this.handleNickname(socket, frame);
        return;
      case "more":
        await this.handleMore(socket, frame);
        return;
      case "verify":
        await this.handleVerify(socket, frame);
        return;
      default:
        this.recordProtocolViolation(socket);
    }
  }

  private upgradeWebSocket(request: Request): Response {
    const ipGuardKey = request.headers.get("X-Chat-IP-Guard-Key");

    if (!ipGuardKey) {
      return jsonResponse({ error: "FORBIDDEN" }, 403);
    }

    const currentSockets = this.state.getWebSockets();
    const currentIpConnectionCount = currentSockets.filter((socket) => {
      return this.getAttachment(socket)?.ipGuardKey === ipGuardKey;
    }).length;
    const pendingJoinCount = currentSockets.filter((socket) => {
      return this.getAttachment(socket)?.joined === false;
    }).length;

    if (
      currentSockets.length >= MAXIMUM_ROOM_CONNECTION_COUNT ||
      pendingJoinCount >= MAXIMUM_PENDING_JOIN_COUNT ||
      currentIpConnectionCount >= MAXIMUM_IP_CONNECTION_COUNT
    ) {
      return new Response(null, { status: 429, headers: { "Retry-After": "10" } });
    }

    const webSocketPair = new WebSocketPair();
    const clientSocket = webSocketPair[0];
    const serverSocket = webSocketPair[1];
    const joinDeadlineAt = Date.now() + JOIN_DEADLINE_IN_MILLISECONDS;
    const attachment: SocketAttachment = {
      v: CHAT_PROTOCOL_VERSION,
      joined: false,
      ipGuardKey,
      joinDeadlineAt,
      protocolViolations: 0,
    };
    serverSocket.serializeAttachment(attachment);
    this.state.acceptWebSocket(serverSocket);
    this.scheduleJoinDeadline(serverSocket, joinDeadlineAt);

    return new Response(null, { status: 101, webSocket: clientSocket });
  }

  private async updateKillSwitch(request: Request): Promise<Response> {
    let requestPayload: unknown;

    try {
      requestPayload = await request.json();
    } catch {
      return jsonResponse({ error: "INVALID_JSON" }, 400);
    }

    if (
      typeof requestPayload !== "object" ||
      requestPayload === null ||
      !("enabled" in requestPayload) ||
      typeof requestPayload.enabled !== "boolean"
    ) {
      return jsonResponse({ error: "INVALID_PAYLOAD" }, 400);
    }

    const reasonCode =
      "reasonCode" in requestPayload && typeof requestPayload.reasonCode === "string"
        ? requestPayload.reasonCode.slice(0, 64)
        : undefined;
    const currentTime = Date.now();
    this.ensureSchema();
    this.state.storage.sql.exec(
      `INSERT INTO settings (id, enabled, reason_code, updated_at)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         enabled = excluded.enabled,
         reason_code = excluded.reason_code,
         updated_at = excluded.updated_at`,
      requestPayload.enabled ? 1 : 0,
      reasonCode ?? null,
      currentTime,
    );
    this.roomState = { readOnly: requestPayload.enabled, reasonCode };
    this.broadcastFrame({
      v: CHAT_PROTOCOL_VERSION,
      t: "state",
      readOnly: requestPayload.enabled,
      reasonCode,
    });
    return jsonResponse(this.roomState);
  }

  private async deleteMessage(messageId: string): Promise<Response> {
    if (!/^[1-9][0-9]{0,18}$/.test(messageId)) {
      return jsonResponse({ error: "INVALID_MESSAGE_ID" }, 400);
    }

    await this.ensureMessagesLoaded();
    const existingMessage = this.messagesById.get(messageId);

    if (!existingMessage) {
      return new Response(null, { status: 204 });
    }

    const replyUpdates = this.messageIds
      .map((currentMessageId) => this.messagesById.get(currentMessageId))
      .filter((message): message is StoredChatMessage => message?.parent?.id === messageId)
      .map((message) => ({
        message,
        parent: message.parent ? { ...message.parent, snippet: "" } : undefined,
      }));
    this.state.storage.transactionSync(() => {
      this.state.storage.sql.exec("DELETE FROM messages WHERE id = ?", Number(messageId));

      for (const replyUpdate of replyUpdates) {
        this.state.storage.sql.exec(
          "UPDATE messages SET parent_json = ? WHERE id = ?",
          replyUpdate.parent ? JSON.stringify(replyUpdate.parent) : null,
          Number(replyUpdate.message.id),
        );
      }
    });

    this.messagesById.delete(messageId);
    this.messageIds = this.messageIds.filter((currentMessageId) => currentMessageId !== messageId);

    for (const replyUpdate of replyUpdates) {
      this.messagesById.set(replyUpdate.message.id, {
        ...replyUpdate.message,
        parent: replyUpdate.parent,
      });
    }

    this.broadcastFrame({ v: CHAT_PROTOCOL_VERSION, t: "delete", id: messageId });
    return new Response(null, { status: 204 });
  }
  // endregion

  // region [Transactions]
  async fetch(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);

    if (requestUrl.pathname === "/v1/chat/ws" && request.method === "GET") {
      return this.upgradeWebSocket(request);
    }
    if (requestUrl.pathname === "/v1/chat/online" && request.method === "GET") {
      return jsonResponse({ online: this.getOnlineActorCount() });
    }
    if (requestUrl.pathname === "/v1/chat/health" && request.method === "GET") {
      return jsonResponse({ ok: true, protocol: CHAT_PROTOCOL_VERSION });
    }
    if (requestUrl.pathname === "/v1/admin/chat/kill-switch" && request.method === "POST") {
      return this.updateKillSwitch(request);
    }
    if (requestUrl.pathname.startsWith("/v1/admin/chat/messages/") && request.method === "DELETE") {
      return this.deleteMessage(requestUrl.pathname.split("/").at(-1) ?? "");
    }

    return jsonResponse({ error: "NOT_FOUND" }, 404);
  }

  async webSocketMessage(socket: WebSocket, rawMessage: string | ArrayBuffer): Promise<void> {
    if (typeof rawMessage !== "string") {
      this.sendError(socket, "PROTOCOL_ERROR");
      socket.close(1003, "binary frames are not supported");
      return;
    }
    if (new TextEncoder().encode(rawMessage).byteLength > 8 * 1024) {
      this.sendError(socket, "FRAME_TOO_LARGE");
      socket.close(1009, "frame too large");
      return;
    }

    const frame = parseClientFrame(rawMessage);
    if (!frame) {
      this.recordProtocolViolation(socket);
      return;
    }

    const attachment = this.getAttachment(socket);
    if (!attachment) {
      socket.close(1008, "invalid attachment");
      return;
    }

    try {
      if (!attachment.joined) {
        if (frame.t !== "join") {
          this.recordProtocolViolation(socket);
          return;
        }
        await this.handleJoin(socket, frame);
        return;
      }
      if (frame.t === "join") {
        this.recordProtocolViolation(socket);
        return;
      }

      await this.handleJoinedFrame(socket, frame);
    } catch (error) {
      if (error instanceof ChatValidationError) {
        const requestId = "rid" in frame ? frame.rid : undefined;
        this.sendFrame(socket, {
          v: CHAT_PROTOCOL_VERSION,
          t: "err",
          rid: requestId,
          code: error.code,
          message: error.message,
        });
        return;
      }

      const requestId = "rid" in frame ? frame.rid : undefined;
      this.sendError(socket, "INTERNAL_ERROR", requestId);
    }
  }

  webSocketClose(socket: WebSocket): void {
    this.clearJoinDeadline(socket);
    this.scheduleOnlineBroadcast();
  }

  webSocketError(socket: WebSocket): void {
    this.clearJoinDeadline(socket);
    this.scheduleOnlineBroadcast();
  }

  async alarm(): Promise<void> {
    const currentTime = Date.now();
    this.ensureSchema();
    this.state.storage.sql.exec(
      "DELETE FROM actor_state WHERE last_activity_at < ?",
      currentTime - ACTOR_STATE_RETENTION_IN_MILLISECONDS,
    );
    const koreaDate = getKoreaDate(currentTime);

    for (const socket of this.getJoinedSockets()) {
      const attachment = this.getAttachment(socket);

      if (!attachment?.stableActorKey || !attachment.nickname) {
        continue;
      }

      const { dailyActorKey, anonId } = await deriveDailyActor(
        this.workerEnv.ACTOR_SECRET,
        koreaDate,
        attachment.stableActorKey,
      );
      const nextAttachment = { ...attachment, dailyActorKey, anonId };
      socket.serializeAttachment(nextAttachment);
      this.sendFrame(socket, {
        v: CHAT_PROTOCOL_VERSION,
        t: "me",
        me: {
          anonId,
          nickname: attachment.nickname,
          verifiedUntil: attachment.verifiedUntil,
        },
      });
    }

    await this.state.storage.setAlarm(getNextKoreaMidnight(currentTime));
  }
  // endregion
}
