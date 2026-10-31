import { describe, expect, it } from "vitest";
import {
  applyCameraDrag,
  applyKeyboardYaw,
  clampCameraPitch,
  createDefaultCameraOrbit,
  dampVector,
  resolveCameraFocus,
  resolveCameraPosition,
  resolveDampFactor,
  resolveFollowDamping,
  SPACE_CAMERA,
  SPACE_CAMERA_FOCUS_HEIGHT,
} from "@/features/space-controls/model/followCamera";

const ORIGIN_PLAYER = { x: 0, z: 0, yaw: 0 };

describe("clampCameraPitch", () => {
  it("피치를 허용 범위로 자른다", () => {
    expect(clampCameraPitch(-Math.PI / 2)).toBe(SPACE_CAMERA.minPitch);
    expect(clampCameraPitch(Math.PI / 2)).toBe(SPACE_CAMERA.maxPitch);
    expect(clampCameraPitch(SPACE_CAMERA.defaultPitch)).toBe(SPACE_CAMERA.defaultPitch);
  });
});

describe("applyCameraDrag", () => {
  it("가로 1000 px 드래그는 yaw 를 250° 돌린다", () => {
    const orbit = applyCameraDrag(createDefaultCameraOrbit(0), 1000, 0);

    expect((orbit.yaw * 180) / Math.PI).toBeCloseTo(250, 6);
  });

  it("위로 끌면 피치가 올라간다", () => {
    const orbit = applyCameraDrag(createDefaultCameraOrbit(0), 0, -40);

    expect(orbit.pitch).toBeGreaterThan(SPACE_CAMERA.defaultPitch);
  });

  it("드래그가 피치 범위를 넘지 못한다", () => {
    const lookedDown = applyCameraDrag(createDefaultCameraOrbit(0), 0, 100_000);
    const lookedUp = applyCameraDrag(createDefaultCameraOrbit(0), 0, -100_000);

    expect(lookedDown.pitch).toBe(SPACE_CAMERA.minPitch);
    expect(lookedUp.pitch).toBe(SPACE_CAMERA.maxPitch);
  });
});

describe("applyKeyboardYaw", () => {
  it("1초간 회전하면 keyboardYawRate 만큼 돈다", () => {
    const orbit = applyKeyboardYaw(createDefaultCameraOrbit(0), 1, 1);

    expect(orbit.yaw).toBeCloseTo(SPACE_CAMERA.keyboardYawRate, 9);
    expect(orbit.pitch).toBe(SPACE_CAMERA.defaultPitch);
  });
});

describe("resolveCameraPosition", () => {
  it("기본 피치에서 카메라 높이는 규격서의 3.2 다", () => {
    const position = resolveCameraPosition(ORIGIN_PLAYER, createDefaultCameraOrbit(0));

    expect(position.y).toBeCloseTo(3.2, 9);
  });

  it("yaw 0 이면 카메라가 플레이어 뒤(+Z)에 선다", () => {
    const position = resolveCameraPosition(ORIGIN_PLAYER, createDefaultCameraOrbit(0));

    expect(position.x).toBeCloseTo(0, 9);
    expect(position.z).toBeGreaterThan(0);
  });

  it("yaw 90° 면 카메라가 +X 쪽으로 돈다", () => {
    const position = resolveCameraPosition(ORIGIN_PLAYER, {
      yaw: Math.PI / 2,
      pitch: SPACE_CAMERA.defaultPitch,
    });

    expect(position.x).toBeGreaterThan(0);
    expect(position.z).toBeCloseTo(0, 9);
  });

  it("주시점과의 거리는 피치와 무관하게 distance 로 유지된다", () => {
    const focus = resolveCameraFocus(ORIGIN_PLAYER);

    for (const pitch of [SPACE_CAMERA.minPitch, SPACE_CAMERA.defaultPitch, SPACE_CAMERA.maxPitch]) {
      const position = resolveCameraPosition(ORIGIN_PLAYER, { yaw: 0.7, pitch });
      const distance = Math.hypot(position.x - focus.x, position.y - focus.y, position.z - focus.z);

      expect(distance).toBeCloseTo(SPACE_CAMERA.distance, 9);
    }
  });

  it("피치를 내리면 카메라가 더 높이 올라간다", () => {
    const shallow = resolveCameraPosition(ORIGIN_PLAYER, { yaw: 0, pitch: SPACE_CAMERA.maxPitch });
    const steep = resolveCameraPosition(ORIGIN_PLAYER, { yaw: 0, pitch: SPACE_CAMERA.minPitch });

    expect(steep.y).toBeGreaterThan(shallow.y);
  });

  it("주시점은 플레이어를 따라가고 높이는 고정이다", () => {
    const focus = resolveCameraFocus({ x: 4, z: -9, yaw: 2 });

    expect(focus).toEqual({ x: 4, y: SPACE_CAMERA_FOCUS_HEIGHT, z: -9 });
  });
});

describe("resolveDampFactor", () => {
  it("경과 시간이 0 이하면 전혀 움직이지 않는다", () => {
    expect(resolveDampFactor(SPACE_CAMERA.followDamping, 0)).toBe(0);
    expect(resolveDampFactor(SPACE_CAMERA.followDamping, -1)).toBe(0);
  });

  it("계수는 항상 0 과 1 사이다", () => {
    for (const deltaSeconds of [1 / 240, 1 / 60, 1 / 30, 1, 10]) {
      const factor = resolveDampFactor(SPACE_CAMERA.followDamping, deltaSeconds);

      expect(factor).toBeGreaterThan(0);
      expect(factor).toBeLessThanOrEqual(1);
    }
  });

  it("모션 축소 환경의 감쇠가 더 빠르게 따라붙는다", () => {
    const normal = resolveDampFactor(resolveFollowDamping(false), 1 / 60);
    const reduced = resolveDampFactor(resolveFollowDamping(true), 1 / 60);

    expect(reduced).toBeGreaterThan(normal);
  });
});

describe("dampVector", () => {
  it("목표를 지나치지 않고 가까워진다", () => {
    const current = { x: 0, y: 0, z: 0 };
    const target = { x: 10, y: 10, z: 10 };
    const next = dampVector(current, target, SPACE_CAMERA.followDamping, 1 / 60);

    expect(next.x).toBeGreaterThan(0);
    expect(next.x).toBeLessThan(target.x);
  });

  it("프레임레이트가 달라도 같은 시간 뒤 위치가 거의 같다", () => {
    const target = { x: 10, y: 0, z: 0 };
    let at60 = { x: 0, y: 0, z: 0 };
    let at30 = { x: 0, y: 0, z: 0 };

    for (let index = 0; index < 60; index += 1) {
      at60 = dampVector(at60, target, SPACE_CAMERA.followDamping, 1 / 60);
    }
    for (let index = 0; index < 30; index += 1) {
      at30 = dampVector(at30, target, SPACE_CAMERA.followDamping, 1 / 30);
    }

    expect(at60.x).toBeCloseTo(at30.x, 2);
  });
});
