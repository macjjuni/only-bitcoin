import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type AnimationClip, type Mesh, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createHiddenBossState,
  resolveBossAttackSeconds,
  SPACE_BOSS,
  SPACE_BOSS_ATTACKS,
  SPACE_BOSS_CLIP_SECONDS,
  SPACE_BOSS_DEATH,
  SPACE_BOSS_SPAWN,
  type SpaceBossState,
} from "@/entities/space";
import { createBossAnimator } from "./bossAnimator";
import { BOSS_NODE_NAMES, type BossModel, prepareBossModel } from "./bossModel";

/**
 * 실제 에셋을 열어 모션 연결을 확인함.
 *
 * 눈으로 봐야 아는 것(예고가 보스에 끌려가는지, 돌진이 두 번 나아가는지)을 숫자로 고정함.
 */

const FRAME_SECONDS = 1 / 60;
const { arena } = SPACE_BOSS;

let model: BossModel;
let animations: AnimationClip[];

// region [Privates]
const loadBossModel = async (): Promise<BossModel> => {
  const buffer = readFileSync(resolve(process.cwd(), "public/models/bear-raid-boss.glb"));
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  const gltf = await new GLTFLoader().parseAsync(arrayBuffer, "");

  animations = gltf.animations;

  return prepareBossModel(gltf);
};

const createState = (overrides: Partial<SpaceBossState>): SpaceBossState => ({
  ...createHiddenBossState(),
  ...overrides,
});

/** 0초부터 `untilSeconds` 까지 60 fps 로 돌림. 상태의 시작 시각은 0 임. */
const runAnimator = (
  state: SpaceBossState,
  untilSeconds: number,
  onFrame?: (seconds: number, emergence: number) => void,
): void => {
  const animator = createBossAnimator(model);

  for (let seconds = 0; seconds <= untilSeconds; seconds += FRAME_SECONDS) {
    // 콜백이 없어도 `update` 는 돌아야 해서 따로 받음. `?.()` 는 인자 평가까지 건너뜀.
    const emergence = animator.update(state, seconds * 1000, FRAME_SECONDS);

    onFrame?.(seconds, emergence);
  }

  animator.dispose();
};

const readWorldPosition = (name: string): Vector3 => {
  const node = model.scene.getObjectByName(name);

  if (!node) {
    throw new Error(`'${name}' 노드가 없습니다.`);
  }

  model.scene.updateMatrixWorld(true);

  return node.getWorldPosition(new Vector3());
};
// endregion

beforeAll(async () => {
  model = await loadBossModel();
});

describe("prepareBossModel", () => {
  it("예고 노드를 보스 몸과 따로 움직이는 묶음으로 옮긴다", () => {
    for (const name of Object.values(BOSS_NODE_NAMES.aoe)) {
      const parent = model.scene.getObjectByName(name)?.parent;

      // 돌진 띠만 길이를 되돌리는 그룹을 하나 거쳐서 묶음에 달림.
      expect(name === BOSS_NODE_NAMES.aoe.charge ? parent?.parent : parent).toBe(model.aoeAnchor);
    }
  });

  it("돌진 띠는 폭만 커지고 길이는 판정 길이 그대로 그린다", () => {
    const charge = model.scene.getObjectByName(BOSS_NODE_NAMES.aoe.charge);
    const worldScale = new Vector3();

    // 띠 노드의 크기는 모션이 넣음. 다 펼쳐진 크기(1)로 두고 잼.
    charge?.scale.setScalar(1);
    model.scene.updateMatrixWorld(true);
    charge?.getWorldScale(worldScale);

    expect(worldScale.x).toBeCloseTo(SPACE_BOSS.modelScale, 5);
    expect(worldScale.z).toBeCloseTo(1, 5);
    expect(
      readWorldPosition(BOSS_NODE_NAMES.aoe.charge).distanceTo(model.aoeAnchor.position),
    ).toBeCloseTo(SPACE_BOSS_ATTACKS.charge.forwardOffset, 3);
  });

  it("두 번 손봐도 묶음을 또 만들지 않는다", () => {
    const again = prepareBossModel({ scene: model.scene, animations });

    expect(again.aoeAnchor).toBe(model.aoeAnchor);
    expect(model.scene.children.filter((child) => child === model.aoeAnchor)).toHaveLength(1);
  });

  it("돌진 모션에서 루트 전진을 뺀다", () => {
    const trackNames = model.clips.charge.tracks.map((track) => track.name);

    expect(trackNames).not.toContain(`${BOSS_NODE_NAMES.rootBone}.position`);
    expect(trackNames).toContain(`${BOSS_NODE_NAMES.rootBone}.quaternion`);
  });

  it("피격 모션은 뼈 회전·이동만 남긴다", () => {
    const trackNames = model.clips.hit.tracks.map((track) => track.name);

    expect(trackNames.length).toBeGreaterThan(0);
    expect(trackNames.some((name) => name.startsWith("AOE_"))).toBe(false);
    expect(trackNames.some((name) => name.endsWith(".scale"))).toBe(false);
  });
});

describe("createBossAnimator", () => {
  it("숨은 상태에서는 그리지 않는다", () => {
    runAnimator(createState({ phase: "hidden" }), 0.1);

    expect(model.scene.visible).toBe(false);
  });

  it("등장할 때 땅속에서 솟아오른다", () => {
    const heights: number[] = [];

    runAnimator(createState({ phase: "spawn" }), SPACE_BOSS_SPAWN.totalSeconds, () => {
      heights.push(model.rig.position.y);
    });

    expect(heights[0]).toBeCloseTo(arena.floorY - SPACE_BOSS_SPAWN.riseDepth, 1);
    expect(heights.at(-1)).toBe(arena.floorY);
    expect(heights.every((height, index) => index === 0 || height >= heights[index - 1])).toBe(
      true,
    );
  });

  it("처치되면 누운 뒤에 가라앉고 그림자도 사라진다", () => {
    const sinkStart = SPACE_BOSS_CLIP_SECONDS.death + SPACE_BOSS_DEATH.holdSeconds;
    let heightBeforeSink = 0;
    let lastEmergence = 1;

    runAnimator(
      createState({ phase: "dead" }),
      SPACE_BOSS_DEATH.totalSeconds,
      (seconds, emergence) => {
        if (seconds < sinkStart) {
          heightBeforeSink = model.rig.position.y;
        }
        lastEmergence = emergence;
      },
    );

    expect(heightBeforeSink).toBe(arena.floorY);
    expect(model.rig.position.y).toBeCloseTo(arena.floorY - SPACE_BOSS_DEATH.sinkDepth, 1);
    expect(lastEmergence).toBeCloseTo(0, 1);
  });

  it("휘두르기 예고는 판정 직후 꺼지고 그 전에는 켜져 있다", () => {
    const { hitSeconds } = SPACE_BOSS_ATTACKS.swipe;
    const swipe = model.scene.getObjectByName(BOSS_NODE_NAMES.aoe.swipe);
    const visibleAt = new Map<string, boolean>();

    runAnimator(
      createState({ phase: "attack", attack: "swipe" }),
      SPACE_BOSS_CLIP_SECONDS.swipe,
      (seconds) => {
        if (seconds < hitSeconds) {
          visibleAt.set("before", swipe?.visible ?? false);
        }
        if (seconds > hitSeconds + 0.5) {
          visibleAt.set("after", swipe?.visible ?? true);
        }
      },
    );

    expect(visibleAt.get("before")).toBe(true);
    expect(visibleAt.get("after")).toBe(false);
  });

  it("회전 예고는 도는 내내 켜져서 보스를 따라가고 다 돌면 꺼진다", () => {
    const { radius, launchSeconds, arriveSeconds } = SPACE_BOSS_ATTACKS.spin;
    const spin = model.scene.getObjectByName(BOSS_NODE_NAMES.aoe.spin);
    const footprint = model.scene.getObjectByName("Spin__01_full_footprint") as Mesh | undefined;
    const originX = arena.centerX + 3;
    const state = createState({
      phase: "attack",
      attack: "spin",
      x: originX,
      z: arena.centerZ,
      attackOriginX: originX,
      attackOriginZ: arena.centerZ,
    });
    const visibleAt = new Map<string, boolean>();
    let drawnRadius = 0;
    let followGap = 0;

    footprint?.geometry.computeBoundingBox();

    runAnimator(state, resolveBossAttackSeconds("spin"), (seconds) => {
      if (seconds > 0.2 && seconds < launchSeconds) {
        visibleAt.set("windup", spin?.visible ?? false);
      }
      if (seconds > launchSeconds && seconds < arriveSeconds - 0.1) {
        // 서버가 하듯 도는 동안 상태 위치를 옮김.
        state.x = originX - (seconds - launchSeconds) * SPACE_BOSS_ATTACKS.spin.moveSpeed;
        // 모션의 도는 구간(1초)이 끝나는 이음매에서도 꺼지면 안 됨.
        visibleAt.set("spinning", (visibleAt.get("spinning") ?? true) && (spin?.visible ?? false));
        drawnRadius =
          (footprint?.geometry.boundingBox?.max.x ?? 0) *
          (spin?.scale.x ?? 0) *
          model.aoeAnchor.scale.x;
        followGap = Math.max(
          followGap,
          Math.abs(readWorldPosition(BOSS_NODE_NAMES.aoe.spin).x - model.rig.position.x),
        );
      }
      if (seconds > arriveSeconds + 0.1) {
        visibleAt.set("after", spin?.visible ?? true);
      }
    });

    expect(visibleAt.get("windup")).toBe(true);
    expect(visibleAt.get("spinning")).toBe(true);
    expect(visibleAt.get("after")).toBe(false);
    // 보이는 원이 판정 반지름과 같음.
    expect(drawnRadius).toBeCloseTo(radius, 3);
    // 상태 위치는 이번 프레임 것을 그리므로 예고와 몸이 한 프레임 안에서 같은 자리임.
    expect(followGap).toBeLessThan(SPACE_BOSS_ATTACKS.spin.moveSpeed * FRAME_SECONDS + 1e-6);
    expect(Math.abs(state.x - originX)).toBeGreaterThan(10);
  });

  it("돌진 중 보스는 상태 위치를 따르고 예고는 시작 자리에 남는다", () => {
    const originX = arena.centerX + 4;
    const originZ = arena.centerZ;
    const state = createState({
      phase: "attack",
      attack: "charge",
      x: originX,
      z: originZ,
      attackOriginX: originX,
      attackOriginZ: originZ,
      // 전방이 −X.
      yaw: Math.PI / 2,
    });

    // 서버가 하듯 상태 위치만 9 m 옮김.
    state.x = originX - SPACE_BOSS_ATTACKS.charge.travel;
    runAnimator(state, SPACE_BOSS_CLIP_SECONDS.charge);

    const rootBone = readWorldPosition(BOSS_NODE_NAMES.rootBone);
    const lane = readWorldPosition(BOSS_NODE_NAMES.aoe.charge);

    // 모션이 따로 나아가지 않음(루트 전진을 뺐음).
    expect(rootBone.x).toBeCloseTo(state.x, 2);
    expect(rootBone.z).toBeCloseTo(originZ, 2);
    // 예고 직선은 시작 자리에서 앞(−X)으로 `forwardOffset` 만큼.
    expect(lane.x).toBeCloseTo(originX - SPACE_BOSS_ATTACKS.charge.forwardOffset, 2);
    expect(lane.z).toBeCloseTo(originZ, 2);
  });

  it("피격을 얹어도 공격 모션의 시각은 밀리지 않는다", () => {
    const state = createState({ phase: "attack", attack: "slam" });
    const flash = model.scene.getObjectByName("Slam__05_contact_flash");
    let flashSeconds = -1;

    runAnimator(state, SPACE_BOSS_CLIP_SECONDS.slam, (seconds) => {
      if (seconds > 0.5 && state.lastHitAt === undefined) {
        state.lastHitAt = seconds * 1000;
      }
      if (flashSeconds < 0 && (flash?.scale.x ?? 0) > 0.5) {
        flashSeconds = seconds;
      }
    });

    expect(flashSeconds).toBeGreaterThanOrEqual(SPACE_BOSS_ATTACKS.slam.hitSeconds - FRAME_SECONDS);
    expect(flashSeconds).toBeLessThan(SPACE_BOSS_ATTACKS.slam.hitSeconds + FRAME_SECONDS * 2);
  });
});

describe("재생기 수명", () => {
  /** 왼쪽 허벅지가 `seconds` 동안 돈 각도 합(도). 모션이 실제로 재생되는지 봄. */
  const measureThighMotion = (state: SpaceBossState, seconds: number, skipSeconds = 0): number => {
    const thigh = model.scene.getObjectByName("thighL");
    let previous = thigh?.quaternion.clone();
    let degrees = 0;

    runAnimator(state, skipSeconds + seconds, (elapsedSeconds) => {
      if (thigh && previous) {
        // 앞 자세에서 넘어오는 첫 구간은 건너뜀. 그 움직임은 모션 재생이 아님.
        degrees +=
          elapsedSeconds > skipSeconds ? (thigh.quaternion.angleTo(previous) * 180) / Math.PI : 0;
        previous = thigh.quaternion.clone();
      }
    });

    return degrees;
  };

  it("앞 재생기를 버린 뒤 새로 만들어도 걷기·달리기가 재생된다", () => {
    // 개발 모드(StrictMode)는 마운트 직후 정리 함수를 한 번 돌리고 다시 마운트함.
    createBossAnimator(model).dispose();

    const walk = measureThighMotion(
      createState({ phase: "walk", speed: SPACE_BOSS.returnSpeed }),
      SPACE_BOSS_CLIP_SECONDS.walk,
    );
    const run = measureThighMotion(
      createState({ phase: "run", speed: SPACE_BOSS.chaseSpeed }),
      SPACE_BOSS_CLIP_SECONDS.run,
    );
    const idle = measureThighMotion(createState({ phase: "idle" }), SPACE_BOSS_CLIP_SECONDS.walk);

    expect(walk).toBeGreaterThan(60);
    expect(run).toBeGreaterThan(60);
    expect(walk).toBeGreaterThan(idle * 3);
  });

  it("속도가 0 이면 걷는 다리가 멈춘다", () => {
    const stalled = measureThighMotion(createState({ phase: "walk", speed: 0 }), 1, 0.5);

    expect(stalled).toBeLessThan(1);
  });
});
