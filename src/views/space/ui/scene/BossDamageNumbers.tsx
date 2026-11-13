"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, useRef, useState } from "react";
import { SPACE_BOSS, type SpaceBossState } from "@/entities/space";
import type { SpaceBossHitEvent } from "@/features/space-session";

/** 숫자가 떠 있는 시간(ms). `.space-damage-number` 애니메이션 길이와 같아야 함. */
const DAMAGE_NUMBER_LIFETIME_MS = 900;
/**
 * 동시에 띄우는 숫자 상한.
 *
 * 50명이 초당 한 번씩 때리면 초당 50개가 옴. `<Html>` 은 하나하나가 DOM 이라 다 띄우면
 * 프레임이 떨어짐. 넘치면 오래된 것부터 내림.
 */
const MAXIMUM_DAMAGE_NUMBERS = 10;
/** 숫자가 뜨기 시작하는 높이(m). 키가 4.5 m 이고 그 위 5.1 m 에 체력판이 있어 더 위로 잡았음. */
const HEAD_HEIGHT = 5.7;
/** 숫자끼리 겹치지 않게 좌우·앞뒤로 흩는 폭(m). */
const SCATTER_WIDTH = 2.4;
/** 거리와 무관하게 읽히는 크기. 명찰·말풍선과 같은 값. */
const DISTANCE_FACTOR = 18;

interface DamageNumber {
  id: number;
  damage: number;
  isMine: boolean;
  position: [number, number, number];
  expiresAt: number;
}

interface BossDamageNumbersProps {
  /** 숫자를 띄울 자리의 기준. 맞은 순간의 보스 위치를 읽음. */
  bossState: SpaceBossState;
  /** 쌓인 피격을 꺼냄. 매 프레임 부름. */
  drainBossHits: () => SpaceBossHitEvent[];
  /** 내 좌석. 내가 준 피해는 강조함. */
  selfSeat: number | undefined;
  /** 내 공격이 닿았을 때 부름. 타격음을 냄. */
  onHitByMe?: () => void;
  /** 남의 공격이 닿았을 때 부름. 거리에 따라 작게 타격음을 냄. */
  onHitByOthers?: () => void;
}

/**
 * 보스 머리 위로 떠오르는 피해 숫자.
 *
 * 맞은 순간의 자리에 박아 둠. 보스를 따라다니게 하면 돌진 중에 숫자가 같이 끌려가 못 읽음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function BossDamageNumbers({ bossState, drainBossHits, selfSeat, onHitByMe, onHitByOthers }: BossDamageNumbersProps): ReactNode {
  // region [Hooks]
  const [numbers, setNumbers] = useState<DamageNumber[]>([]);
  const nextIDRef = useRef<number>(0);
  /** 가장 빨리 사라질 숫자의 시각. 그 전에는 목록을 건드리지 않음. */
  const nextExpiryRef = useRef<number>(Number.POSITIVE_INFINITY);
  // endregion


  // region [Privates]
  const createNumber = (event: SpaceBossHitEvent, now: number): DamageNumber => {
    nextIDRef.current += 1;

    return {
      id: nextIDRef.current,
      damage: event.damage,
      isMine: event.from === selfSeat,
      position: [
        bossState.x + (Math.random() - 0.5) * SCATTER_WIDTH,
        SPACE_BOSS.arena.floorY + HEAD_HEIGHT + Math.random() * 0.6,
        bossState.z + (Math.random() - 0.5) * SCATTER_WIDTH,
      ],
      expiresAt: now + DAMAGE_NUMBER_LIFETIME_MS,
    };
  };

  /** 새 피격을 더하고 다 뜬 숫자를 내림. 바뀔 게 없으면 상태를 안 건드림. */
  const syncNumbers = (now: number): void => {
    const events = drainBossHits();

    if (events.length === 0 && now < nextExpiryRef.current) {
      return;
    }

    const created = events.map((event) => createNumber(event, now));

    // 한 프레임에 여러 대가 닿아도 한 번만 냄.
    if (created.some((number) => number.isMine)) {
      onHitByMe?.();
    }
    if (created.some((number) => !number.isMine)) {
      onHitByOthers?.();
    }

    setNumbers((previousNumbers) => {
      const nextNumbers = [...previousNumbers.filter((number) => number.expiresAt > now), ...created]
        .slice(-MAXIMUM_DAMAGE_NUMBERS);

      nextExpiryRef.current = nextNumbers.reduce(
        (earliest, number) => Math.min(earliest, number.expiresAt),
        Number.POSITIVE_INFINITY,
      );

      return nextNumbers;
    });
  };
  // endregion


  // region [Life Cycles]
  useFrame(() => {
    syncNumbers(performance.now());
  });
  // endregion

  return (
    <>
      {numbers.map((number) => (
        <group key={number.id} position={number.position}>
          <Html
            center
            distanceFactor={DISTANCE_FACTOR}
            zIndexRange={[30, 0]}
            style={{ pointerEvents: "none" }}
          >
            <span
              className={`space-damage-number block whitespace-nowrap font-extrabold tabular-nums [text-shadow:0_2px_4px_rgba(0,0,0,0.85)] ${
                number.isMine ? "text-3xl text-bitcoin" : "text-xl text-white/85"
              }`}
            >
              {number.damage}
            </span>
          </Html>
        </group>
      ))}
    </>
  );
}

const MemoizedBossDamageNumbers = memo(BossDamageNumbers);
MemoizedBossDamageNumbers.displayName = "BossDamageNumbers";

export default MemoizedBossDamageNumbers;
