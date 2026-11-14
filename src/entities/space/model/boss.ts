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

export type SpaceBossAttack = "swipe" | "slam" | "charge" | "spin";

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

/**
 * 보스를 에셋 크기에서 키우는 배율. **크기를 바꾸려면 이 값만 고침.**
 *
 * 에셋은 키 4.5 m 임. 몸(모델 · 몸통 반지름 · 키 · 그림자 · 솟고 가라앉는 깊이)과 공격(타격 범위 ·
 * 바닥 예고 · 타격 연출)이 이 비율로 같이 커짐. 아래 수치는 에셋 기준 값에 배율을 곱해 둔 것임.
 * 서버 판정도 같은 값을 써서 바꾸면 워커도 다시 배포함.
 *
 * **돌진의 길이와 이동 거리만 안 키움.** 아레나 짧은 쪽이 가운데에서 10.8 m 라, 9 m 보다 길어지면
 * 끝점이 아레나를 벗어나 그 방향으로는 돌진을 못 함. 폭과 시작 거리는 몸에 맞춰 커짐.
 *
 * 이동 속도는 안 바꿈. 대신 보폭(`SPACE_BOSS_STRIDE`)이 같이 커져서 걸음이 그만큼 느리게 돎.
 */
const BOSS_MODEL_SCALE = 1.25;

export const SPACE_BOSS = {
  /** 그릴 때 모델에 곱하는 배율. */
  modelScale: BOSS_MODEL_SCALE,
  /**
   * 아레나. 맵 GLB `Snow_Arena_Center`(38, 2, −1) 가 중심임.
   *
   * 안뜰 바닥 모양대로 모서리가 둥근 직사각형임(x 26 ~ 50, z −16.5 ~ 14.5). 전에는 반지름
   * 12 m 원이었는데 안뜰 바닥은 25 × 32 m 직사각형이라, 위아래 끝의 4 m 띠와 네 모서리가
   * 빠져서 거기 서 있으면 보스가 안 쫓았음. 치수는 맵 충돌 메시에서 읽었음 — 평평한 바닥이
   * x 26 ~ 51, z −17 ~ 15 이고 담이 z −18 · 16 에 있음.
   *
   * 홀 쪽 발코니와 계단(x 21 ~ 26)은 범위 밖임. 발코니는 바닥보다 4 m 높아서 높이
   * 조건(`arenaHeightTolerance`)으로도 걸러짐.
   */
  arena: {
    centerX: 38,
    centerZ: -1,
    floorY: 2 + SPACE_HALL.mapOffsetY,
    /** 중심에서 x 쪽 끝까지(m). */
    halfWidth: 12,
    /** 중심에서 z 쪽 끝까지(m). */
    halfDepth: 15.5,
    /** 모서리를 둥글린 반지름(m). 각진 구석에 몰리면 보스가 들어오지 못함. */
    cornerRadius: 3,
  },
  /**
   * 보스가 아레나 가장자리에서 이만큼 안쪽까지만 다님(m).
   *
   * 아레나가 담 바로 앞까지라 가장자리까지 가면 몸통이 담에 파묻힘.
   * 담에 붙어 선 유저도 휘두르기(3.5 m)가 닿아서 안전한 자리는 안 생김.
   */
  roamMargin: 1.2,
  /** 몸통 반지름(m). 유저 공격 사거리와 겹침 방지가 이 값을 뺀 거리로 잼. */
  bodyRadius: 1.6 * BOSS_MODEL_SCALE,
  /** 키(m). 이보다 위(발코니)에 있는 유저는 몸으로 막지 않음. */
  height: 4.5 * BOSS_MODEL_SCALE,
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
  /** 5명이 쉬지 않고 때리면 약 2분, 피하면서 싸우면 6 ~ 10분. */
  maximumHealth: 6_000,
  /**
   * 표준 공격 한 번의 피해. 실제 피해는 캐릭터마다 다르고(`SpaceAvatarCombat`),
   * 초당 피해는 셋 다 10 안팎으로 맞춰 둠.
   */
  kickDamage: 10,
  /**
   * 공격 피해가 기준값에서 위아래로 흔들리는 비율. 0.2 면 기준의 80 ~ 120 %.
   *
   * 고정 피해면 같은 캐릭터로 같은 횟수를 때린 사람끼리 순위가 정확히 같아짐.
   * 평균은 기준값 그대로라 초당 피해 균형은 안 바뀜.
   */
  kickDamageSpreadRatio: 0.2,
  /** 보스 몸통에서 이 거리 안이어야 닿음(m). 렌치 길이 정도. */
  kickReach: 2,
  /** 보스를 향한 정도(내적)가 이보다 커야 닿음. 등지고 휘두른 건 안 맞음. 약 70° 안. */
  kickFacingDot: 0.34,
  /**
   * 공격별 기준 피해. 유저 최대 체력 100 기준 3 ~ 5대.
   *
   * 회전만 작음. 도는 4초 동안 1초마다 다시 맞아서 다 맞으면 평균 60 임.
   */
  attackDamage: { swipe: 20, slam: 35, charge: 30, spin: 15 },
  /**
   * 보스 공격 피해가 기준값에서 위아래로 흔들리는 비율. 0.2 면 기준의 80 ~ 120 %.
   *
   * 휘두르기 16 ~ 24, 내려찍기 28 ~ 42, 돌진 24 ~ 36, 회전 12 ~ 18. 유저 공격과 같은 폭임.
   * 한 번에 여럿이 맞아도 사람마다 따로 뽑음.
   */
  attackDamageSpreadRatio: 0.2,
  /**
   * 판정 범위를 예고보다 이만큼 작게 잡음(m).
   *
   * 서버가 아는 유저 위치는 실제보다 0.1 ~ 0.3초 늦음. 예고 밖으로 막 나간 사람이
   * 맞으면 억울해서 유저에게 유리하게 깎음.
   *
   * 0.3 이었는데 0.1 로 줄임. 가장 작은 휘두르기(반지름 3.5 m)는 보스 몸통(1.6 m) 때문에
   * 맞는 구간이 원래 좁아서, 0.3 을 깎으면 표시된 부채꼴 끝에 서 있어도 안 맞는 게 눈에 띄었음.
   */
  hitMargin: 0.1,
  /**
   * 쓰러지면 그 사람의 누적 피해에서 깎는 비율.
   *
   * 무작정 들이받는 것보다 피하면서 싸운 사람이 순위에서 앞서게 함. 순위와 어그로에만
   * 반영하고 보스 체력은 안 돌려줌 — 돌려주면 죽을수록 보스가 회복함.
   */
  deathDamagePenaltyRatio: 0.2,
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
  /**
   * 회전을 시작한 뒤 다음 회전까지 두는 간격(ms).
   *
   * 한 번이 5.5초라 근접 순서대로 매번 쓰면 싸움의 절반을 돌기만 함.
   */
  spinIntervalMs: 15_000,
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
  /**
   * 쓰러진 자리에 누워 있는 시간(ms). 지나면 서버가 홀로 옮김.
   *
   * 바로 옮기면 남의 화면에서는 맞자마자 사라져 쓰러지는 모습을 볼 수 없음. 앞 절반은
   * 그 자리에서 쓰러지고, 뒤 절반은 홀에서 일어남.
   */
  respawnMoveDelayMs: 1_500,
} as const;

/** 젠 주기(ms). 한국 시간 짝수 정시(0, 2, 4시 …)마다임. */
export const SPACE_BOSS_SPAWN_INTERVAL_MS = 2 * 60 * 60 * 1_000;

/** 모션별 보폭 속도(m/s). 재생 속도 = 실제 속도 ÷ 이 값. */
export const SPACE_BOSS_STRIDE = {
  walk: 1.2516 * BOSS_MODEL_SCALE,
  run: 4.1868 * BOSS_MODEL_SCALE,
} as const;

/** 모션 길이(초). GLB 클립 이름은 첫 글자만 대문자임(`Swipe`, `Idle` …). */
export const SPACE_BOSS_CLIP_SECONDS = {
  swipe: framesToSeconds(53),
  slam: framesToSeconds(65),
  charge: framesToSeconds(71),
  spin: framesToSeconds(60),
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

/**
 * 회전 모션의 구간(초). 에셋 `Spin` 은 준비 1초 · 두 바퀴 도는 1초 · 마무리 0.5초임.
 *
 * 도는 1초를 `BOSS_SPIN_LOOP_COUNT` 번 이어 틀어 길게 돎. 두 바퀴를 꽉 채워 돌고 끝나는
 * 구간이라 이어 붙여도 자세가 안 튐.
 */
const BOSS_SPIN_LAUNCH_SECONDS = framesToSeconds(24);
const BOSS_SPIN_LOOP_SECONDS = framesToSeconds(24);
/** 5 번(5초)이었는데 피하는 시간이 너무 길어 4 번으로 줄임. */
const BOSS_SPIN_LOOP_COUNT = 4;

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
  swipe: {
    radius: 3.5 * BOSS_MODEL_SCALE,
    fullAngle: (120 * Math.PI) / 180,
    hitSeconds: framesToSeconds(23),
  },
  /** 보스 앞 `forwardOffset` 에 중심을 둔 원. */
  slam: {
    radius: 4 * BOSS_MODEL_SCALE,
    forwardOffset: 2.304 * BOSS_MODEL_SCALE,
    hitSeconds: framesToSeconds(33),
  },
  /** 보스 앞 `forwardOffset` 에서 시작하는 직선. 보스가 `travel` 만큼 나아감. */
  charge: {
    width: 3 * BOSS_MODEL_SCALE,
    length: 9,
    forwardOffset: 2.762 * BOSS_MODEL_SCALE,
    travel: 9,
    launchSeconds: framesToSeconds(24),
    arriveSeconds: framesToSeconds(46),
  },
  /**
   * 발밑에 중심을 둔 원. 팔을 벌리고 돌면서 타깃을 쫓아감. 예고 원도 보스를 따라감.
   *
   * 매 틱 타깃을 다시 쫓지 않고 `repathSeconds` 마다 목적지를 정해 곧장 감. 서버가 구간을
   * 통째로 알려 주고 클라이언트가 같은 식(`resolveBossSpinPosition`)으로 그려서, 프레임이
   * 늦거나 몰려 와도 화면과 판정이 같은 자리를 지나감. 틱마다 쫓던 때는 위치를 100 ms
   * 프레임으로만 알 수 있어 모바일에서 끊기고 늦어 보였음.
   *
   * 한순간이 아니라 `launchSeconds` 부터 `arriveSeconds` 까지 도는 내내 판정함.
   * 같은 사람은 `rehitSeconds` 마다 다시 맞음.
   * 예고는 내려찍기 원(에셋 기준 4 m)을 0.7배로 줄여 그려서 에셋 기준 반지름이 2.8 m 임. 에셋 `extras` 의 3.1 은
   * 판정 여유 0.3 을 빼기 전 값이라 안 옮김. 원이 이미 여유를 뺀 크기라 `hitMargin` 은 안 뺌.
   */
  spin: {
    radius: 2.8 * BOSS_MODEL_SCALE,
    launchSeconds: BOSS_SPIN_LAUNCH_SECONDS,
    arriveSeconds: BOSS_SPIN_LAUNCH_SECONDS + BOSS_SPIN_LOOP_SECONDS * BOSS_SPIN_LOOP_COUNT,
    /** 모션에서 도는 구간의 길이. 이만큼을 되풀이해 틂. */
    loopSeconds: BOSS_SPIN_LOOP_SECONDS,
    /** 돌면서 쫓는 속도(m/s). 추적(4)보다 느려서 걸어서도 벗어남. */
    moveSpeed: 3,
    /** 목적지를 다시 정하는 간격(초). 이 동안은 방향을 안 바꿈. */
    repathSeconds: 1,
    /**
     * 구간을 시작하기 이만큼 전에 목적지를 정해 알림(초).
     *
     * 시작과 동시에 알리면 프레임이 오는 동안 클라이언트는 서 있다가 뒤늦게 따라붙음.
     */
    planLeadSeconds: 0.3,
    rehitSeconds: 1,
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
  riseDepth: 4.2 * BOSS_MODEL_SCALE,
  /** 솟는 시간 + 모션 길이. */
  totalSeconds: 0.9 + SPACE_BOSS_CLIP_SECONDS.spawn,
  /** 이때까지는 맞지 않음. 솟는 시간 + 에셋이 정한 1.25초. */
  invulnerableSeconds: 0.9 + framesToSeconds(30),
} as const;

/** 처치 연출. `Death` 모션으로 뒤로 넘어져 잠깐 누워 있다가 눈밭으로 가라앉음. */
export const SPACE_BOSS_DEATH = {
  holdSeconds: 1.6,
  sinkSeconds: 1.8,
  /** 누운 몸 높이(에셋 기준 2.5 m)보다 깊게 내림. */
  sinkDepth: 3 * BOSS_MODEL_SCALE,
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
  if (attack === "spin") {
    const { launchSeconds, arriveSeconds, loopSeconds } = SPACE_BOSS_ATTACKS.spin;

    // 모션의 도는 구간(1초)을 늘려 틀어서 모션 길이보다 김.
    return SPACE_BOSS_CLIP_SECONDS.spin + (arriveSeconds - launchSeconds - loopSeconds);
  }

  return SPACE_BOSS_CLIP_SECONDS[attack];
};

/**
 * 회전을 시작한 뒤 `elapsedSeconds` 가 지났을 때 `Spin` 모션에서 틀 지점(초).
 *
 * 준비는 그대로 틀고, 도는 구간을 되풀이하다가, 다 돌면 마무리로 넘어감.
 */
export const resolveBossSpinClipSeconds = (elapsedSeconds: number): number => {
  const { launchSeconds, arriveSeconds, loopSeconds } = SPACE_BOSS_ATTACKS.spin;

  if (elapsedSeconds <= launchSeconds) {
    return Math.max(0, elapsedSeconds);
  }

  if (elapsedSeconds >= arriveSeconds) {
    return launchSeconds + loopSeconds + (elapsedSeconds - arriveSeconds);
  }

  return launchSeconds + ((elapsedSeconds - launchSeconds) % loopSeconds);
};

/**
 * 회전 공격의 이동 한 구간. `startedAt` 에 `from` 을 떠나 `moveSpeed` 로 `to` 까지 곧장 감.
 *
 * 시각은 서버 프레임에서는 서버 시각이고, 받는 쪽이 자기 축으로 옮겨 견줌.
 */
export interface SpaceBossSpinSegment {
  startedAt: number;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
}

/**
 * 회전 공격 중 `nowMs` 에 있을 자리. 아직 첫 구간이 시작 전이면 `null`.
 *
 * 서버가 판정할 자리를 구할 때도, 클라이언트가 그릴 때도 이 함수를 씀.
 *
 * @param path 시작 시각 순서로 놓인 구간. `nowMs` 는 `startedAt` 과 같은 시계 축이어야 함.
 */
export const resolveBossSpinPosition = (
  path: readonly SpaceBossSpinSegment[],
  nowMs: number,
): { x: number; z: number } | null => {
  let active: SpaceBossSpinSegment | null = null;

  for (const segment of path) {
    if (segment.startedAt <= nowMs) {
      active = segment;
    }
  }

  if (!active) {
    return null;
  }

  const distance = Math.hypot(active.toX - active.fromX, active.toZ - active.fromZ);
  const travelled = ((nowMs - active.startedAt) / 1000) * SPACE_BOSS_ATTACKS.spin.moveSpeed;
  const ratio = distance <= 1e-6 ? 1 : Math.min(1, travelled / distance);

  return {
    x: active.fromX + (active.toX - active.fromX) * ratio,
    z: active.fromZ + (active.toZ - active.fromZ) * ratio,
  };
};

/**
 * 돌진을 시작한 뒤 `elapsedSeconds` 가 지났을 때 나아간 거리(m).
 *
 * 서버가 틱마다 보스 위치를 구할 때도, 클라이언트가 틱 사이 위치를 그릴 때도 이 함수를 씀.
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

/** 기준값의 `1 ± spreadRatio` 안에서 정수 하나를 고름. `random` 이 0.5 면 기준값임. */
const rollSpreadDamage = (baseDamage: number, spreadRatio: number, random: number): number => {
  const spread = (random * 2 - 1) * spreadRatio;

  // 피해가 작은 캐릭터도 0 이 나오면 안 됨.
  return Math.max(1, Math.round(baseDamage * (1 + spread)));
};

/**
 * 이번 공격의 피해를 뽑음. 기준값의 `1 ± kickDamageSpreadRatio` 안에서 고른 정수임.
 *
 * 서버만 부름. 클라이언트는 서버가 알려 준 값을 그대로 띄움.
 *
 * @param random 0 이상 1 미만의 난수. 0.5 면 기준값이 나옴.
 */
export const rollKickDamage = (baseDamage: number, random: number): number => {
  return rollSpreadDamage(baseDamage, SPACE_BOSS_COMBAT.kickDamageSpreadRatio, random);
};

/**
 * 보스 공격 한 대의 피해를 뽑음. 기준값의 `1 ± attackDamageSpreadRatio` 안에서 고른 정수임.
 *
 * 서버만 부름. 클라이언트는 서버가 알려 준 값을 그대로 띄움.
 *
 * @param random 0 이상 1 미만의 난수. 0.5 면 기준값이 나옴.
 */
export const rollBossAttackDamage = (attack: SpaceBossAttack, random: number): number => {
  return rollSpreadDamage(
    SPACE_BOSS_COMBAT.attackDamage[attack],
    SPACE_BOSS_COMBAT.attackDamageSpreadRatio,
    random,
  );
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
