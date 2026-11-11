import { SPACE_MARKET } from "@/entities/space";

/** 전광판 안에서만 재생하는 짧은 색종이 폭죽. 좌표는 패널 크기에 대한 비율임. */
export const SCREEN_CELEBRATION = {
  particleCount: 180,
  durationSeconds: SPACE_MARKET.burstDurationMs / 1000,
  burstCount: SPACE_MARKET.burstCount,
  burstIntervalSeconds: SPACE_MARKET.burstIntervalMs / 1000,
  colors: ["#f7931a", "#ffd166", "#fff3d1", "#5eead4", "#fb7185", "#a78bfa"],
} as const;

/** 최초 발동으로부터 0·10·20초에 발사한다. 쉬는 구간과 종료 후에는 표시하지 않는다. */
export const readCelebrationBurstElapsed = (elapsedSeconds: number): number | null => {
  const { burstCount, burstIntervalSeconds, durationSeconds } = SCREEN_CELEBRATION;
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    return null;
  }

  const burstIndex = Math.floor(elapsedSeconds / burstIntervalSeconds);
  const burstElapsed = elapsedSeconds - burstIndex * burstIntervalSeconds;
  return burstIndex < burstCount && burstElapsed < durationSeconds ? burstElapsed : null;
};

export interface ConfettiParticle {
  originX: number;
  originY: number;
  delay: number;
  velocityX: number;
  velocityY: number;
  size: number;
  phase: number;
  spin: number;
  isSparkle: boolean;
}

/** 같은 입자를 매 프레임 다시 뽑지 않도록 초기 모양을 고정한다. */
export const createConfettiParticles = (eventSeed = 0): ConfettiParticle[] => {
  const sample = (seed: number): number => {
    const value = Math.sin(seed * 127.1 + (eventSeed % 100000) * 0.73 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  // 양쪽 아래에서 안쪽으로 쏜다. 넓은 속도 편차가 부채꼴 궤적을 만들어
  // 가장자리부터 반대쪽 화면까지 퍼지며, 각 입자의 정점과 낙하 시점도 달라진다.
  return Array.from({ length: SCREEN_CELEBRATION.particleCount }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    return {
      originX: side * (0.43 + sample(index + 7) * 0.015),
      originY: -0.44 + sample(index + 8) * 0.015,
      delay: sample(index + 1) * 0.18 + (side > 0 ? 0.06 : 0),
      velocityX: -side * (0.04 + sample(index + 2) * 1.56),
      velocityY: 1.3 + sample(index + 3) * 0.95,
      size: 0.006 + sample(index + 4) * 0.005,
      phase: sample(index + 5) * Math.PI * 2,
      spin: 3 + sample(index + 6) * 8,
      isSparkle: index % 5 === 0,
    };
  });
};

/**
 * 처음에는 빠르게 솟구치고, 공기 저항으로 감속한 뒤 천천히 흩날려 내려온다.
 * 수직 속도에도 저항을 적용해 상승 정점에서 뭉치거나 곧장 바닥으로 사라지지 않게 한다.
 */
export const readConfettiPose = (particle: ConfettiParticle, elapsedSeconds: number) => {
  const age = elapsedSeconds - particle.delay;
  const drag = 1 - Math.exp(-2 * Math.max(0, age));
  const travel = drag / 2;
  const drift = (Math.sin(age * 3 + particle.phase) - Math.sin(particle.phase)) * 0.012 * drag;
  const x = particle.originX + particle.velocityX * travel + drift;
  const y = particle.originY + (particle.velocityY + 0.22) * travel - 0.22 * age;
  const fade = Math.min(
    1,
    Math.max(0, (SCREEN_CELEBRATION.durationSeconds - elapsedSeconds) / 0.7),
  );
  const flutter = 0.25 + Math.abs(Math.cos(age * particle.spin + particle.phase)) * 0.75;
  const size = particle.size * fade * (particle.isSparkle ? 0.55 : 1);
  const isVisible =
    age >= 0 &&
    elapsedSeconds < SCREEN_CELEBRATION.durationSeconds &&
    Math.abs(x) < 0.48 &&
    Math.abs(y) < 0.48;

  return {
    x,
    y,
    size: isVisible ? size : 0,
    flutter,
    rotation: particle.phase + age * particle.spin,
  };
};
