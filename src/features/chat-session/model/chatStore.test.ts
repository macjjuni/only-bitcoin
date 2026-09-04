import { beforeEach, describe, expect, it } from "vitest";
import type { ChatMessage } from "@/entities/chat-message";
import useChatStore, { mergeChatMessages } from "./chatStore";

const createMessage = (id: string): ChatMessage => ({
  id,
  anonId: "a3f9c1d2",
  nickname: "익명",
  body: `메시지 ${id}`,
  reactions: { rocket: 0, fear: 0, diamond: 0, up: 0 },
  myReactions: [],
  createdAt: Number(id),
});

describe("chat store", () => {
  beforeEach(() => {
    useChatStore.getState().resetChatStore();
  });

  it("메시지를 ID 순서로 병합하고 중복을 제거하며 최신 300개만 남긴다", () => {
    const messages = Array.from({ length: 301 }, (_, index) => createMessage(String(index + 1)));
    const normalizedMessages = mergeChatMessages({ messageIds: [], messagesById: {} }, [
      ...messages,
      createMessage("301"),
    ]);

    expect(normalizedMessages.messageIds).toHaveLength(300);
    expect(normalizedMessages.messageIds[0]).toBe("2");
    expect(normalizedMessages.messageIds.at(-1)).toBe("301");
  });

  it("reaction count와 내 선택 상태를 서로 다른 frame으로 갱신한다", () => {
    const chatStore = useChatStore.getState();
    chatStore.applyServerFrame({
      v: 1,
      t: "msg",
      message: createMessage("7"),
    });
    chatStore.addPendingRequest("reaction-rid", "react");
    chatStore.applyServerFrame({
      v: 1,
      t: "react",
      updates: [{ id: "7", reactions: { rocket: 1, fear: 0, diamond: 0, up: 0 } }],
    });
    chatStore.applyServerFrame({
      v: 1,
      t: "ack",
      rid: "reaction-rid",
      action: "react",
      reaction: { id: "7", key: "rocket", active: true },
    });

    expect(useChatStore.getState().messagesById["7"]?.reactions.rocket).toBe(1);
    expect(useChatStore.getState().messagesById["7"]?.myReactions).toEqual(["rocket"]);
    expect(useChatStore.getState().pendingRequests["reaction-rid"]?.status).toBe("acknowledged");
  });

  it("관리자 삭제 시 원문을 제거하고 답글 snippet을 비운다", () => {
    const parentMessage = createMessage("1");
    const replyMessage = {
      ...createMessage("2"),
      parent: { id: "1", anonId: "a3f9c1d2", nickname: "익명", snippet: "원문" },
    };
    const chatStore = useChatStore.getState();
    chatStore.applyServerFrame({
      v: 1,
      t: "init",
      messages: [parentMessage, replyMessage],
      me: { anonId: "b4f8d1e3", nickname: "익명" },
      online: 1,
      readOnly: false,
      serverTime: Date.now(),
    });
    chatStore.applyServerFrame({ v: 1, t: "delete", id: "1" });

    expect(useChatStore.getState().messagesById["1"]).toBeUndefined();
    expect(useChatStore.getState().messagesById["2"]?.parent?.snippet).toBe("");
  });
});
