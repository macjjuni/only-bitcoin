import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AnimationMixer, Box3, type Object3D, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { beforeAll, describe, expect, it } from "vitest";
import { SPACE_BARISTA } from "./barista";
import { type BaristaModel, prepareBaristaModel } from "./baristaModel";

/**
 * 실제 에셋을 열어 `SPACE_BARISTA` 에 옮겨 둔 값과 어긋나지 않는지 확인함.
 *
 * 에셋을 다시 구워 키나 모션 이름이 바뀌면 여기서 먼저 깨짐.
 */

let model: BaristaModel;

// region [Privates]
const loadBaristaModel = async (): Promise<BaristaModel> => {
  const buffer = readFileSync(resolve(process.cwd(), "public/models/barista-skirt.glb"));
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;

  return prepareBaristaModel(await new GLTFLoader().parseAsync(arrayBuffer, ""));
};

const findBone = (name: string): Object3D => {
  const bone = model.scene.getObjectByName(name);

  if (!bone) {
    throw new Error(`'${name}' 뼈가 없습니다.`);
  }

  return bone;
};
// endregion

beforeAll(async () => {
  model = await loadBaristaModel();
});

describe("바리스타 모델 ↔ barista-skirt.glb", () => {
  it("발바닥이 원점이고 키가 `modelHeight` 와 같다", () => {
    const bounds = new Box3().setFromObject(model.scene);

    expect(bounds.min.y).toBeCloseTo(0, 3);
    expect(bounds.max.y).toBeCloseTo(SPACE_BARISTA.modelHeight, 3);
  });

  it("대기 모션은 제자리에서 6초를 돌고, 처음과 끝 자세가 이어진다", () => {
    const mixer = new AnimationMixer(model.scene);
    const root = findBone("root");
    // 모션 가운데쯤 오른손을 들어 올림. 숨 쉬는 움직임은 몇 mm 라 손으로 봄.
    const hand = findBone("handR");
    const readHand = (): Vector3 => {
      model.scene.updateMatrixWorld(true);

      return hand.getWorldPosition(new Vector3());
    };

    mixer.clipAction(model.idleClip).play();
    mixer.setTime(0);
    const startHand = readHand();

    mixer.setTime(model.idleClip.duration / 2);
    const middleHand = readHand();

    expect(model.idleClip.duration).toBeCloseTo(6, 3);
    // 제자리 모션이라 뿌리는 안 움직임. 움직이면 선 자리에서 벗어남.
    expect(root.position.length()).toBeCloseTo(0, 3);
    // 가만히 굳어 있는 모션이 아닌지.
    expect(startHand.distanceTo(middleHand)).toBeGreaterThan(0.1);

    mixer.setTime(model.idleClip.duration - 1e-4);

    expect(readHand().distanceTo(startHand)).toBeLessThan(0.005);
  });

  it("숨만 쉬는 모션은 길이가 같고, 손은 그대로 둔 채 몸만 움직인다", () => {
    const mixer = new AnimationMixer(model.scene);
    const hand = findBone("handR");
    const upperArm = findBone("upper_armR");
    const pelvis = findBone("pelvis");

    mixer.clipAction(model.restClip).play();
    mixer.setTime(0);
    const startArm = upperArm.quaternion.clone();
    const startHand = hand.quaternion.clone();
    const startPelvis = pelvis.position.clone();

    // 손짓이 가장 큰 때(3초)에도 팔은 첫 자세임.
    mixer.setTime(model.restClip.duration / 2);

    expect(model.restClip.duration).toBe(model.idleClip.duration);
    // 손짓은 0.5 rad 쯤 돎. `angleTo` 는 같은 값끼리도 부동소수 오차로 1e-3 쯤 나옴.
    expect(upperArm.quaternion.angleTo(startArm)).toBeLessThan(0.01);
    expect(hand.quaternion.angleTo(startHand)).toBeLessThan(0.01);

    // 숨은 3초 주기라 1.5초에 가장 많이 움직임.
    mixer.setTime(model.restClip.duration / 4);

    expect(pelvis.position.distanceTo(startPelvis)).toBeGreaterThan(0.001);
  });
});
