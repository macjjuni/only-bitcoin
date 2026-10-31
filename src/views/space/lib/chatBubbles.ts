import { type RemotePlayer, SPACE_OVERLAY_LIMITS, type SpaceChatMessage } from "@/entities/space";
import { selectNearestVisible } from "./avatarCulling";

export interface ReceivedSpaceMessage {
  message: SpaceChatMessage;
  receivedAt: number;
}

export interface SpaceChatBubble extends RemotePlayer {
  message: SpaceChatMessage;
}

/** 서버와 기기의 시계차에 영향받지 않도록 로컬 수신 시각으로 TTL을 계산한다. */
export const selectSpaceChatBubbles = (
  receivedMessages: readonly ReceivedSpaceMessage[],
  players: readonly RemotePlayer[],
  viewer: { x: number; z: number },
  now: number,
): SpaceChatBubble[] => {
  const latestBySeat = new Map<number, SpaceChatMessage>();
  for (const { message, receivedAt } of receivedMessages) {
    const age = now - receivedAt;
    if (age >= 0 && age < SPACE_OVERLAY_LIMITS.bubbleTtlMs) {
      latestBySeat.set(message.seat, message);
    }
  }
  const candidates: SpaceChatBubble[] = [];
  for (const player of players) {
    const message = latestBySeat.get(player.seat);
    if (message) {
      candidates.push({ ...player, message });
    }
  }
  return selectNearestVisible(candidates, viewer, {
    maxDistance: SPACE_OVERLAY_LIMITS.nameplateMaxDistance,
    maxCount: SPACE_OVERLAY_LIMITS.bubbleMaxCount,
  });
};
