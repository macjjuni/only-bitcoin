"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, type ReactNode, type RefObject, useRef, useState } from "react";

/** 숫자가 떠 있는 시간(ms). `.space-damage-number` 애니메이션 길이와 같아야 함. */
const DAMAGE_NUMBER_LIFETIME_MS = 900;
/**
 * 동시에 띄우는 숫자 상한.
 *
 * 회전 공격은 원 안의 모두가 1초마다 맞음. `<Html>` 은 하나하나가 DOM 이라 다 띄우면
 * 프레임이 떨어짐. 넘치면 오래된 것부터 내림.
 */
const MAXIMUM_DAMAGE_NUMBERS = 10;
/** 숫자끼리 겹치지 않게 좌우·앞뒤로 흩는 폭(m). 사람 몸 너비 정도. */
const SCATTER_WIDTH = 0.6;
/** 거리와 무관하게 읽히는 크기. 보스 피해 숫자와 같은 값. */
const DISTANCE_FACTOR = 18;

/** 띄울 피해 하나. 씬이 맞은 순간에 자리까지 정해서 넘김. */
export interface PlayerDamage {
  damage: number;
  /** 내가 맞은 것인지. 내 피해는 강조함. */
  isMine: boolean;
  /** 숫자가 뜨기 시작할 자리. 맞은 사람의 명찰 높이임. */
  x: number;
  y: number;
  z: number;
}

interface DamageNumber {
  id: number;
  damage: number;
  isMine: boolean;
  position: [number, number, number];
  expiresAt: number;
}

interface PlayerDamageNumbersProps {
  /** 아직 안 띄운 피해. 씬이 쌓고 여기서 매 프레임 비움. */
  pendingRef: RefObject<PlayerDamage[]>;
}

/**
 * 보스 공격에 맞은 유저 머리 위로 떠오르는 피해 숫자.
 *
 * 맞은 순간의 자리에 박아 둠. 맞으면 밀려나서, 따라다니게 하면 숫자가 같이 끌려가 못 읽음.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function PlayerDamageNumbers({ pendingRef }: PlayerDamageNumbersProps): ReactNode {
  // region [Hooks]
  const [numbers, setNumbers] = useState<DamageNumber[]>([]);
  const nextIDRef = useRef<number>(0);
  /** 가장 빨리 사라질 숫자의 시각. 그 전에는 목록을 건드리지 않음. */
  const nextExpiryRef = useRef<number>(Number.POSITIVE_INFINITY);
  // endregion


  // region [Privates]
  const createNumber = (event: PlayerDamage, now: number): DamageNumber => {
    nextIDRef.current += 1;

    return {
      id: nextIDRef.current,
      damage: event.damage,
      isMine: event.isMine,
      position: [
        event.x + (Math.random() - 0.5) * SCATTER_WIDTH,
        event.y + Math.random() * 0.3,
        event.z + (Math.random() - 0.5) * SCATTER_WIDTH,
      ],
      expiresAt: now + DAMAGE_NUMBER_LIFETIME_MS,
    };
  };

  /** 새 피해를 더하고 다 뜬 숫자를 내림. 바뀔 게 없으면 상태를 안 건드림. */
  const syncNumbers = (now: number): void => {
    const events = pendingRef.current;

    if (events.length === 0 && now < nextExpiryRef.current) {
      return;
    }
    pendingRef.current = [];

    const created = events.map((event) => createNumber(event, now));

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
              className={`space-damage-number block select-none whitespace-nowrap font-extrabold tabular-nums [text-shadow:0_2px_4px_rgba(0,0,0,0.85)] ${
                number.isMine ? "text-3xl text-red-500" : "text-xl text-red-300/90"
              }`}
            >
              -{number.damage}
            </span>
          </Html>
        </group>
      ))}
    </>
  );
}

const MemoizedPlayerDamageNumbers = memo(PlayerDamageNumbers);
MemoizedPlayerDamageNumbers.displayName = "PlayerDamageNumbers";

export default MemoizedPlayerDamageNumbers;
