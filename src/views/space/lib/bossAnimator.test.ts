import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type AnimationClip, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createHiddenBossState,
  SPACE_BOSS,
  SPACE_BOSS_ATTACKS,
  SPACE_BOSS_CLIP_SECONDS,
  SPACE_BOSS_DEATH,
  SPACE_BOSS_SPAWN,
  type SpaceBossState,
} from "@/entities/space";
import { createBossAnimator } from "./bossAnimator";
import { BOSS_NODE_NAMES, type BossModel, prepareBossModel } from "./bossModel";
import { type BossPreviewPlayer, createBossPreview } from "./bossPreview";

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
      expect(model.scene.getObjectByName(name)?.parent).toBe(model.aoeAnchor);
    }
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

    // 미리보기·서버가 하듯 상태 위치만 9 m 옮김.
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

describe("createBossPreview", () => {
  const insidePlayer: BossPreviewPlayer = {
    x: arena.centerX - 8,
    y: arena.floorY,
    z: arena.centerZ,
  };
  const outsidePlayer: BossPreviewPlayer = { x: 0, y: SPACE_BOSS.arena.floorY - 2, z: 0 };

  const runPreview = (
    seconds: number,
    player: BossPreviewPlayer,
    preview = createBossPreview(),
    fromSeconds = 0,
  ) => {
    const phases = new Set<string>();

    for (let elapsed = fromSeconds; elapsed <= fromSeconds + seconds; elapsed += FRAME_SECONDS) {
      preview.step(elapsed * 1000, FRAME_SECONDS, player);
      phases.add(preview.state.attack ?? preview.state.phase);
    }

    return { preview, phases };
  };

  it("아무도 없으면 등장한 뒤 가운데 서 있는다", () => {
    const { preview, phases } = runPreview(10, outsidePlayer);

    expect([...phases]).toEqual(["spawn", "idle"]);
    expect(preview.state.x).toBe(arena.centerX);
    expect(preview.state.z).toBe(arena.centerZ);
  });

  it("아레나에 들어오면 쫓아와 공격하고 아레나를 벗어나지 않는다", () => {
    const preview = createBossPreview();
    const phases = new Set<string>();
    let farthest = 0;

    for (let elapsed = 0; elapsed <= 60; elapsed += FRAME_SECONDS) {
      // 플레이어가 아레나 안을 크게 돎.
      const angle = elapsed * 0.6;
      const player = {
        x: arena.centerX + Math.cos(angle) * 9,
        y: arena.floorY,
        z: arena.centerZ + Math.sin(angle) * 9,
      };

      preview.step(elapsed * 1000, FRAME_SECONDS, player);
      phases.add(preview.state.attack ?? preview.state.phase);
      farthest = Math.max(
        farthest,
        Math.hypot(preview.state.x - arena.centerX, preview.state.z - arena.centerZ),
      );
    }

    expect(phases.has("run")).toBe(true);
    expect(phases.has("swipe") || phases.has("slam") || phases.has("charge")).toBe(true);
    expect(farthest).toBeLessThanOrEqual(arena.radius);
  });

  it("대상이 나가면 걸어서 가운데로 돌아온다", () => {
    const engaged = runPreview(12, insidePlayer);
    const { preview, phases } = runPreview(40, outsidePlayer, engaged.preview, 12);

    expect(phases.has("walk")).toBe(true);
    expect(preview.state.phase).toBe("idle");
    expect(
      Math.hypot(preview.state.x - arena.centerX, preview.state.z - arena.centerZ),
    ).toBeLessThan(0.5);
  });

  it("맞다 보면 포효하고 · 비틀거리고 · 쓰러졌다가 다시 나온다", () => {
    const preview = createBossPreview();
    const phases: string[] = [];

    for (let elapsed = 0; elapsed <= 90; elapsed += FRAME_SECONDS) {
      const nowMs = elapsed * 1000;
      // 보스 바로 옆에 붙어서 1초마다 때림.
      const player = { x: preview.state.x + 2, y: arena.floorY, z: preview.state.z };

      preview.step(nowMs, FRAME_SECONDS, player);
      if (Math.abs(elapsed % 1) < FRAME_SECONDS) {
        preview.registerKick(nowMs, player);
      }
      if (phases.at(-1) !== preview.state.phase) {
        phases.push(preview.state.phase);
      }
    }

    const sequence = phases.join(" ");

    expect(sequence).toContain("enrage");
    expect(sequence).toContain("stagger");
    expect(sequence).toMatch(/dead hidden spawn/);
    expect(phases.indexOf("enrage")).toBeLessThan(phases.indexOf("stagger"));
  });
});
