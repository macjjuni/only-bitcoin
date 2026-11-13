import { SPACE_HALL } from "./spaceWorld";

/**
 * 레이드 보스 규칙. 서버 판정과 클라이언트 연출이 같이 씀.
 *
 * 모션 길이·판정 시각·돌진 이동표는 `public/models/bear-raid-boss.glb` 에서 옮긴 값이고
 * `boss.test.ts` 가 GLB 를 직접 열어 어긋나지 않는지 고정함. 에셋을 다시 구우면
 * 그 테스트가 먼저 깨짐. 근거는 `docs/btc-space-boss-raid.md`.
 */

/** 에셋 모션의 초당 프레임. 아래 프레임 수는 전부 이 기준임. */
const BOSS_CLIP_FPS = 24;

const framesToSeconds = (frames: number): number => frames / BOSS_CLIP_FPS;

export type SpaceBossAttack = "swipe" | "slam" | "charge";

/**
 * 보스가 지금 하고 있는 일. 모션 하나와 1:1 임.
 *
 * `walk` 는 복귀, `run` 은 추적에 씀. 구분한 이유는 아래 `SPACE_BOSS.returnSpeed` 주석.
 */
export type SpaceBossPhase =
  | "hidden"
  | "spawn"
  | "idle"
  | "walk"
  | "run"
  | "turn"
  | "attack"
  | "stagger"
  | "enrage"
  | "dead";

/**
 * 화면에 그릴 보스 한 마리의 상태.
 *
 * 시각은 전부 `performance.now()` 축(ms)임. 서버가 붙으면 서버 시각을 이 축으로 옮겨 넣음.
 * "지금 몇 초째" 가 아니라 **시작 시각**을 들고 있어서 중간에 들어온 사람도 모션을 이어서 봄.
 */
export interface SpaceBossState {
  phase: SpaceBossPhase;
  /** `phase` 가 `attack` 일 때만 값이 있음. */
  attack: SpaceBossAttack | null;
  phaseStartedAt: number;
  x: number;
  z: number;
  /** 아바타와 같은 규약. 전방이 −Z 이고 yaw θ 의 전방은 `(−sinθ, −cosθ)` 임. */
  yaw: number;
  /**
   * 공격을 시작한 자리. 바닥 예고 표시를 여기 박아 둠.
   *
   * 돌진은 보스가 9 m 나아가서 `x`·`z` 와 달라짐. 예고를 보스에 붙이면 같이 끌려감.
   */
  attackOriginX: number;
  attackOriginZ: number;
  /** 걷기·달리기 실제 속도(m/s). 발이 미끄러지지 않게 모션 재생 속도를 여기 맞춤. */
  speed: number;
  /** 마지막으로 맞은 시각. 값이 바뀌면 움찔하는 모션을 한 번 얹음. */
  lastHitAt: number | undefined;
}

export const SPACE_BOSS = {
  /**
   * 아레나. 맵 GLB `Snow_Arena_Center`(38, 2, −1) 가 중심임.
   *
   * 반지름 12 m 는 안뜰 바닥 안쪽에 드는 값임. 계단 발치(24.5, −11.2)가 중심에서 16.9 m,
   * 바깥 담 램프(x 50.62)가 12.6 m 떨어져 있음.
   */
  arena: {
    centerX: 38,
    centerZ: -1,
    floorY: 2 + SPACE_HALL.mapOffsetY,
    radius: 12,
  },
  /** 몸통 반지름(m). 유저 공격 사거리와 겹침 방지가 이 값을 뺀 거리로 잼. */
  bodyRadius: 1.6,
  /**
   * 추적 속도(m/s). `Run` 모션의 보폭 속도(4.19)에 맞춘 값임.
   *
   * 유저 달리기(8)의 절반이라 도망칠 수 있고, 걷는 유저는 따라잡힘.
   */
  chaseSpeed: 4,
  /**
   * 복귀 속도(m/s). `Walk` 모션의 보폭 속도(1.25) 그대로임.
   *
   * 추적과 같은 4 m/s 로 `Walk` 를 틀면 발이 3배 넘게 미끄러짐. 복귀는 싸움이 끝난
   * 뒤라 느릿하게 걸어 돌아가는 편이 자연스럽고, 그동안 체력을 채울 시간도 생김.
   */
  returnSpeed: 1.25,
  /** 걷거나 달리면서 몸을 돌리는 속도 상한(rad/s). */
  turnRate: 2.8,
  /** 제자리에서 이보다 크게 돌아야 하면 `Turn` 모션을 틀고 돎(rad). 약 70°. */
  turnInPlaceAngle: 1.22,
  /** 공격 사이 쉬는 시간(초). */
  attackRestSeconds: 1.5,
} as const;

/** 서버·클라이언트가 같이 지원한다고 알리는 기능 이름. 아는 쪽에만 보스 프레임을 보냄. */
export const SPACE_FEATURE_BOSS = "boss-v1";

/**
 * 전투 수치. 전부 초기값이고 플레이하면서 조정함. 근거는 계획서 §6.
 */
export const SPACE_BOSS_COMBAT = {
  /** 5명이 쉬지 않고 때리면 약 1분, 피하면서 싸우면 3 ~ 5분. */
  maximumHealth: 3_000,
  /** 유저 공격 한 번의 피해. 쿨다운이 1초라 초당 피해와 같음. */
  kickDamage: 10,
  /** 보스 몸통에서 이 거리 안이어야 닿음(m). 렌치 길이 정도. */
  kickReach: 2,
  /** 보스를 향한 정도(내적)가 이보다 커야 닿음. 등지고 휘두른 건 안 맞음. 약 70° 안. */
  kickFacingDot: 0.34,
  /** 공격별 피해. 유저 최대 체력 100 기준 3 ~ 5대. */
  attackDamage: { swipe: 20, slam: 35, charge: 30 },
  /**
   * 판정 범위를 예고보다 이만큼 작게 잡음(m).
   *
   * 서버가 아는 유저 위치는 실제보다 0.1 ~ 0.3초 늦음. 예고 밖으로 막 나간 사람이
   * 맞으면 억울해서 유저에게 유리하게 깎음.
   */
  hitMargin: 0.3,
  /** 타깃을 다시 고르는 간격(ms). */
  targetRepickMs: 1_000,
  /** 이 시간 동안 이동·공격이 없으면 자리 비움으로 보고 타깃에서 뺌(ms). */
  awayTimeoutMs: 10_000,
  /** 복귀 중 초당 회복 비율. 20초면 가득 참. */
  returnHealRatio: 0.05,
  /** 이 높이 차 안이어야 아레나에 있는 것으로 봄(m). 발코니는 위라서 빠짐. */
  arenaHeightTolerance: 2.5,
  /** 체력이 이 비율 아래로 처음 내려가면 포효 · 비틀거림을 한 번씩 함. */
  enrageHealthRatio: 0.5,
  staggerHealthRatio: 0.25,
  /** 돌진을 연달아 쓰지 않게 두는 간격(ms). */
  chargeIntervalMs: 6_000,
} as const;

/** 유저 체력 규칙. */
export const SPACE_BOSS_PLAYER = {
  maximumHealth: 100,
  /** 홀 안에 있으면 초당 이만큼 참. 안뜰에서는 안 참. */
  hallRegenPerSecond: 10,
  /** 홀과 안뜰의 경계(x). 홀 +X 외벽 자리임. */
  hallMaximumX: 21,
  /** 쓰러진 뒤 다시 움직일 수 있기까지(ms). 그동안 사망 화면을 보여 줌. */
  respawnDelayMs: 3_000,
} as const;

/** 젠 주기(ms). 한국 시간 짝수 정시(0, 2, 4시 …)마다임. */
export const SPACE_BOSS_SPAWN_INTERVAL_MS = 2 * 60 * 60 * 1_000;

/** 모션별 보폭 속도(m/s). 재생 속도 = 실제 속도 ÷ 이 값. */
export const SPACE_BOSS_STRIDE = {
  walk: 1.2516,
  run: 4.1868,
} as const;

/** 모션 길이(초). GLB 클립 이름은 첫 글자만 대문자임(`Swipe`, `Idle` …). */
export const SPACE_BOSS_CLIP_SECONDS = {
  swipe: framesToSeconds(53),
  slam: framesToSeconds(65),
  charge: framesToSeconds(71),
  idle: framesToSeconds(60),
  walk: framesToSeconds(30),
  run: framesToSeconds(16),
  turn: framesToSeconds(16),
  hit: framesToSeconds(10),
  stagger: framesToSeconds(42),
  enrage: framesToSeconds(42),
  spawn: framesToSeconds(48),
  death: framesToSeconds(60),
} as const;

/** `Turn` 모션에서 실제로 몸이 도는 구간(초). 이 사이에만 yaw 를 옮김. 앞뒤는 발 디딤임. */
export const SPACE_BOSS_TURN = {
  pivotFromSeconds: framesToSeconds(3),
  pivotUntilSeconds: framesToSeconds(13),
} as const;

/**
 * 공격 범위와 판정 시각. 좌표는 보스 기준(앞이 +)이고 단위는 m·초임.
 *
 * `hitSeconds` 에 바닥 예고가 다 차고 번쩍임. 서버는 그 순간의 유저 위치로 판정함.
 */
export const SPACE_BOSS_ATTACKS = {
  /** 발밑에서 앞으로 펼친 부채꼴. */
  swipe: { radius: 3.5, fullAngle: (120 * Math.PI) / 180, hitSeconds: framesToSeconds(23) },
  /** 보스 앞 `forwardOffset` 에 중심을 둔 원. */
  slam: { radius: 4, forwardOffset: 2.304, hitSeconds: framesToSeconds(33) },
  /** 보스 앞 `forwardOffset` 에서 시작하는 직선. 보스가 `travel` 만큼 나아감. */
  charge: {
    width: 3,
    length: 9,
    forwardOffset: 2.762,
    travel: 9,
    launchSeconds: framesToSeconds(24),
    arriveSeconds: framesToSeconds(46),
  },
} as const;

/**
 * 돌진 누적 이동 거리(m). `launchSeconds` 부터 한 프레임(1/24 초) 간격임.
 *
 * 등속이 아님. 처음 0.2초는 가속하고 최고 12 m/s 를 넘김. 직선으로 근사하면 중간에서
 * 0.75 m 어긋나 예고 띠와 판정이 따로 놂. 에셋의 루트 이동 키를 그대로 옮겼음.
 */
const BOSS_CHARGE_TRAVEL_METERS = [
  0, 0.088, 0.312, 0.612, 0.93, 1.279, 1.699, 2.167, 2.658, 3.15, 3.62, 4.069, 4.516, 4.964, 5.415,
  5.873, 6.34, 6.836, 7.347, 7.82, 8.32, 8.791, 9,
] as const;

/** 등장 연출. 눈밭에서 웅크린 채 솟아오른 뒤 `Spawn` 모션으로 일어섬. */
export const SPACE_BOSS_SPAWN = {
  /** 솟아오르는 시간(초). 이 동안 모션은 첫 프레임(웅크림)에 멈춰 있음. */
  riseSeconds: 0.9,
  /** 시작 깊이(m). 웅크린 키보다 깊어야 처음에 안 보임. */
  riseDepth: 4.2,
  /** 솟는 시간 + 모션 길이. */
  totalSeconds: 0.9 + SPACE_BOSS_CLIP_SECONDS.spawn,
  /** 이때까지는 맞지 않음. 솟는 시간 + 에셋이 정한 1.25초. */
  invulnerableSeconds: 0.9 + framesToSeconds(30),
} as const;

/** 처치 연출. `Death` 모션으로 뒤로 넘어져 잠깐 누워 있다가 눈밭으로 가라앉음. */
export const SPACE_BOSS_DEATH = {
  holdSeconds: 1.6,
  sinkSeconds: 1.8,
  /** 누운 몸 높이(2.5 m)보다 깊게 내림. */
  sinkDepth: 3,
  totalSeconds: SPACE_BOSS_CLIP_SECONDS.death + 1.6 + 1.8,
} as const;

/**
 * 피격 반응. 전신 모션으로 틀지 않고 지금 모션 위에 얹음.
 *
 * 여러 명이 초당 한 번씩 때려서, 전신으로 틀면 공격 모션이 매번 끊김.
 */
export const SPACE_BOSS_HIT = {
  /** 얹는 세기. 1 이면 에셋의 움찔 그대로임. */
  weight: 0.75,
  /** 이 간격 안에 또 맞으면 다시 틀지 않음(ms). 50명이 동시에 때려도 떨지 않게 함. */
  minimumIntervalMs: 220,
} as const;

/** 공격 한 번의 전체 길이(초). 끝나야 다음 행동으로 넘어감. */
export const resolveBossAttackSeconds = (attack: SpaceBossAttack): number => {
  return SPACE_BOSS_CLIP_SECONDS[attack];
};

/**
 * 돌진을 시작한 뒤 `elapsedSeconds` 가 지났을 때 나아간 거리(m).
 *
 * 서버가 틱마다 보스 위치를 구할 때도, 클라이언트 미리보기도 이 함수를 씀.
 */
export const resolveBossChargeTravel = (elapsedSeconds: number): number => {
  const frame = (elapsedSeconds - SPACE_BOSS_ATTACKS.charge.launchSeconds) * BOSS_CLIP_FPS;
  const lastIndex = BOSS_CHARGE_TRAVEL_METERS.length - 1;

  if (frame <= 0) {
    return 0;
  }

  if (frame >= lastIndex) {
    return BOSS_CHARGE_TRAVEL_METERS[lastIndex];
  }

  const index = Math.floor(frame);
  const from = BOSS_CHARGE_TRAVEL_METERS[index];
  const to = BOSS_CHARGE_TRAVEL_METERS[index + 1];

  return from + (to - from) * (frame - index);
};

/** 아무것도 없는 상태. 젠 전이나 처치 뒤임. */
export const createHiddenBossState = (): SpaceBossState => ({
  phase: "hidden",
  attack: null,
  phaseStartedAt: 0,
  x: SPACE_BOSS.arena.centerX,
  z: SPACE_BOSS.arena.centerZ,
  yaw: Math.PI / 2,
  attackOriginX: SPACE_BOSS.arena.centerX,
  attackOriginZ: SPACE_BOSS.arena.centerZ,
  speed: 0,
  lastHitAt: undefined,
});
