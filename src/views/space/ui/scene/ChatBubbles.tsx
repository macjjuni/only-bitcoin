"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  memo,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Group } from "three";
import {
  type PlayerTransform,
  type RemotePlayer,
  SPACE_AVATAR,
  type SpaceChatMessage,
  type SpacePeer,
} from "@/entities/space";
import { truncateGraphemes } from "@/shared/lib/text/countGraphemes";
import { SPACE_FRAME_PRIORITY } from "@/views/space/lib/framePriority";
import {
  type ReceivedSpaceMessage,
  type SpaceChatBubble,
  selectSpaceChatBubbles,
} from "../../lib/chatBubbles";

interface ChatBubblesProps {
  messages: readonly SpaceChatMessage[];
  players: readonly RemotePlayer[];
  self: SpacePeer | null;
  viewerTransformRef: RefObject<PlayerTransform>;
}

// biome-ignore format: AGENTS.md requires two blank lines between regions.
function ChatBubbles({ messages, players, self, viewerTransformRef }: ChatBubblesProps): ReactNode {
  // region [Hooks]
  const [visibleBubbles, setVisibleBubbles] = useState<SpaceChatBubble[]>([]);
  const receivedMessagesRef = useRef<ReceivedSpaceMessage[]>([]);
  const groupRefs = useRef(new Map<string, Group>());
  const lastSelectionAtRef = useRef(0);
  const activeMessageIDs = useMemo(() => new Set(messages.map(({ id }) => id)), [messages]);
  // endregion


  // region [Privates]
  const recordMessageReceipts = useCallback((): void => {
    const previousReceipts = new Map(receivedMessagesRef.current.map((receipt) => [receipt.message.id, receipt]));
    const receivedAt = performance.now();
    receivedMessagesRef.current = messages.map((message) => previousReceipts.get(message.id) ?? { message, receivedAt });
  }, [messages]);

  const selectVisibleBubbles = (now: number): void => {
    const viewer = viewerTransformRef.current;
    const bubblePlayers = self ? [...players, { ...self, ...viewer }] : players;
    const nextBubbles = selectSpaceChatBubbles(receivedMessagesRef.current, bubblePlayers, viewer, now);
    setVisibleBubbles((previous) => {
      return previous.length === nextBubbles.length && previous.every((bubble, index) => bubble.message.id === nextBubbles[index].message.id) ? previous : nextBubbles;
    });
  };

  const updateBubblePositions = (): void => {
    for (const bubble of visibleBubbles) {
      if (!activeMessageIDs.has(bubble.message.id)) {
        continue;
      }
      const player = bubble.seat === self?.seat ? viewerTransformRef.current : players.find(({ seat }) => seat === bubble.seat);
      const group = groupRefs.current.get(bubble.message.id);
      if (group) {
        group.visible = Boolean(player);
        if (player) {
          group.position.set(player.x, player.y + SPACE_AVATAR.headCenterY + 1.25, player.z);
        }
      }
    }
  };
  // endregion


  // region [Life Cycles]
  useEffect(recordMessageReceipts, [recordMessageReceipts]);

  useFrame(() => {
    const now = performance.now();
    if (now - lastSelectionAtRef.current >= 200) {
      lastSelectionAtRef.current = now;
      selectVisibleBubbles(now);
    }
    updateBubblePositions();
  }, SPACE_FRAME_PRIORITY.overlay);
  // endregion

  // region [Templates]
  const activeBubbles = visibleBubbles.filter(({ message }) => activeMessageIDs.has(message.id));
  // endregion


  return (
    <>
      {activeBubbles.map((bubble) => (
        <group key={bubble.message.id} position={[bubble.x, bubble.y + SPACE_AVATAR.headCenterY + 1.25, bubble.z]} ref={(group) => {
          if (group) {
            groupRefs.current.set(bubble.message.id, group);
          } else {
            groupRefs.current.delete(bubble.message.id);
          }
        }}>
          <Html center distanceFactor={18} zIndexRange={[24, 0]} style={{ pointerEvents: "none" }}>
            <div aria-hidden="true" className="pointer-events-none relative w-max max-w-[220px] select-none rounded-xl border border-white/20 bg-[#121923]/95 px-3 py-2 text-center text-xs leading-relaxed text-white shadow-lg">
              <span className="block max-w-full truncate text-[10px] font-semibold text-white/60">{bubble.message.nickname}</span>
              <span className="line-clamp-3 break-words whitespace-pre-wrap [overflow-wrap:anywhere]">{truncateGraphemes(bubble.message.body, 100)}</span>
              <span className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-b border-r border-white/20 bg-[#121923]" />
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}

export default memo(ChatBubbles);
