"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  type CSSProperties,
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
  resolveAvatarColor,
  SPACE_OVERLAY_LIMITS,
  type SpaceChatMessage,
  type SpacePeer,
} from "@/entities/space";
import { truncateGraphemes } from "@/shared/lib/text/countGraphemes";
import { SPACE_FRAME_PRIORITY } from "@/views/space/lib/framePriority";
import {
  BUBBLE_DISTANCE_FACTOR,
  resolveBubbleLiftPx,
  resolveNameplateLiftY,
} from "@/views/space/lib/overlayLayout";
import {
  type ReceivedSpaceMessage,
  type SpaceChatBubble,
  selectSpaceChatBubbles,
} from "../../lib/chatBubbles";

interface ChatBubbleCardProps {
  body: string;
  nickname: string;
  colorIndex: number;
  isSelf: boolean;
  /** 메시지를 받은 performance.now() 시각. 모르면 지금으로 봄. */
  receivedAt: number | undefined;
}

/**
 * 말풍선 하나.
 *
 * 어두운 장면·어두운 명찰·채팅 패널과 갈리게 흰 말풍선을 씀. 내 말은 닉네임 줄만 뺌.
 * 그림자는 꼬리까지 한 덩어리로 떨어지게 drop-shadow 로 줌.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function ChatBubbleCard({ body, nickname, colorIndex, isSelf, receivedAt }: ChatBubbleCardProps): ReactNode {
  // region [Hooks]
  /**
   * 수명 애니메이션을 받은 시각에 맞춤. 멀어졌다 다시 보여 새로 마운트돼도 처음부터
   * 튀어나오지 않고 남은 수명만 돌게 음수 지연을 줌. 다시 그릴 때 바뀌면 돌던
   * 애니메이션이 건너뛰어서 마운트 때 한 번만 정함.
   */
  const [lifeStyle] = useState<CSSProperties>(() => {
    const age = receivedAt === undefined ? 0 : Math.max(0, performance.now() - receivedAt);

    return {
      animationDuration: `${SPACE_OVERLAY_LIMITS.bubbleTtlMs}ms`,
      animationDelay: `-${Math.round(age)}ms`,
    };
  });
  // endregion


  return (
    <div aria-hidden="true" style={lifeStyle} className="pointer-events-none relative w-max max-w-[220px] origin-bottom select-none font-pretendard drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)] motion-safe:animate-space-bubble-life">
      <div className="rounded-[14px] bg-white px-3 py-[7px] text-left text-[13px] font-medium leading-[1.45] text-slate-900">
        {!isSelf && (
          <span className="mb-px flex max-w-full items-center gap-1 text-[10px] font-bold text-slate-500">
            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: resolveAvatarColor(colorIndex) }} />
            <span className="truncate">{nickname}</span>
          </span>
        )}
        {/* 한글은 어절 단위로 끊고, 띄어쓰기 없는 긴 글만 아무 데서나 끊음. */}
        <span className="line-clamp-3 whitespace-pre-wrap break-keep [overflow-wrap:anywhere]">{truncateGraphemes(body, 100)}</span>
      </div>
      <svg aria-hidden="true" width="14" height="7" viewBox="0 0 14 7" className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 fill-white">
        <path d="M0 0h14L8.2 6.2a1.6 1.6 0 0 1-2.4 0z" />
      </svg>
    </div>
  );
}

interface ChatBubblesProps {
  messages: readonly SpaceChatMessage[];
  players: readonly RemotePlayer[];
  self: SpacePeer | null;
  /** 터치 기기는 명찰이 작게 그려져 말풍선을 덜 올림. */
  isCoarsePointer: boolean;
  viewerTransformRef: RefObject<PlayerTransform>;
}

// biome-ignore format: AGENTS.md requires two blank lines between regions.
function ChatBubbles({ messages, players, self, isCoarsePointer, viewerTransformRef }: ChatBubblesProps): ReactNode {
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

  const resolveReceivedAt = (messageId: string): number | undefined => {
    return receivedMessagesRef.current.find(({ message }) => message.id === messageId)?.receivedAt;
  };

  const updateBubblePositions = (): void => {
    for (const bubble of visibleBubbles) {
      if (!activeMessageIDs.has(bubble.message.id)) {
        continue;
      }
      const isSelfBubble = self !== null && bubble.seat === self.seat;
      const remotePlayer = isSelfBubble ? undefined : players.find(({ seat }) => seat === bubble.seat);
      const player = isSelfBubble ? viewerTransformRef.current : remotePlayer;
      // 고를 때 값이 아니라 지금 모델로 높이를 잡음. 떠 있는 동안 모델을 바꾸면
      // 명찰만 옮겨 가고 말풍선이 옛 높이에 남음.
      const modelIndex = isSelfBubble ? self.modelIndex : remotePlayer?.modelIndex;
      const group = groupRefs.current.get(bubble.message.id);
      if (group) {
        group.visible = Boolean(player);
        if (player && modelIndex !== undefined) {
          group.position.set(player.x, player.y + resolveNameplateLiftY(modelIndex), player.z);
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
  /**
   * 명찰 기준점에 붙인 뒤 아랫변을 명찰 위로 올림. `center` 가 상자 가운데를 기준점에
   * 맞추므로 -50% 로 아랫변을 맞추고 명찰 몫만큼 더 올림. 긴 말은 위로만 늘어남.
   */
  const liftStyle: CSSProperties = { transform: `translateY(calc(-50% - ${resolveBubbleLiftPx(isCoarsePointer)}px))` };
  // endregion


  return (
    <>
      {activeBubbles.map((bubble) => (
        <group key={bubble.message.id} position={[bubble.x, bubble.y + resolveNameplateLiftY(bubble.modelIndex), bubble.z]} ref={(group) => {
          if (group) {
            groupRefs.current.set(bubble.message.id, group);
          } else {
            groupRefs.current.delete(bubble.message.id);
          }
        }}>
          <Html center distanceFactor={BUBBLE_DISTANCE_FACTOR} zIndexRange={[24, 0]} style={{ pointerEvents: "none" }}>
            <div style={liftStyle}>
              <ChatBubbleCard
              body={bubble.message.body}
              nickname={bubble.message.nickname}
              colorIndex={bubble.colorIndex}
              isSelf={bubble.seat === self?.seat}
              receivedAt={resolveReceivedAt(bubble.message.id)}
              />
            </div>
          </Html>
        </group>
      ))}
    </>
  );
}

export default memo(ChatBubbles);
