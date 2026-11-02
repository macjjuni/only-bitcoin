import { describe, expect, it } from "vitest";
import { SPACE_BOUNDS, SPACE_CAMERA_BOUNDS, SPACE_ISLAND } from "@/entities/space";
import {
  applyCameraDrag,
  applyCameraZoom,
  applyKeyboardYaw,
  clampCameraDistance,
  clampCameraPitch,
  clampCameraPosition,
  createDefaultCameraOrbit,
  dampVector,
  resolveCameraFocus,
  resolveCameraPosition,
  resolveDampFactor,
  resolveFollowDamping,
  SPACE_CAMERA,
  SPACE_CAMERA_FOCUS_HEIGHT,
} from "@/features/space-controls/model/followCamera";

const ORIGIN_PLAYER = { x: 0, z: 0, y: 0, yaw: 0 };

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

  /**
   * 부호 규약을 못으로 박아 둔다. `useKeyboardInput` 이 왼쪽 키에 양수를 주므로
   * 양수는 시야가 왼쪽으로 도는 쪽이어야 한다. 전방 `(-sin(yaw), -cos(yaw))` 의
   * x 성분이 음수로 가면 왼쪽이다.
   */
  it("양수 방향은 시야를 왼쪽으로 돌린다", () => {
    const turnedLeft = applyKeyboardYaw({ yaw: 0, pitch: 0, distance: 11 }, 1, 0.5);
    const turnedRight = applyKeyboardYaw({ yaw: 0, pitch: 0, distance: 11 }, -1, 0.5);

    expect(-Math.sin(turnedLeft.yaw)).toBeLessThan(0);
    expect(-Math.sin(turnedRight.yaw)).toBeGreaterThan(0);
  });

  it("왼쪽으로 돌면 카메라가 플레이어 오른쪽(+X)으로 돈다", () => {
    // 시야가 왼쪽을 보려면 카메라는 반대편으로 가야 한다.
    const orbit = applyKeyboardYaw({ yaw: 0, pitch: 0, distance: 11 }, 1, 0.5);
    const position = resolveCameraPosition({ x: 0, z: 0, y: 0, yaw: 0 }, orbit);

    expect(position.x).toBeGreaterThan(0);
  });
});

describe("resolveCameraPosition", () => {
  it("기본 궤도에서 카메라는 주시점보다 높이 선다", () => {
    const position = resolveCameraPosition(ORIGIN_PLAYER, createDefaultCameraOrbit(0));

    expect(position.y).toBeGreaterThan(SPACE_CAMERA_FOCUS_HEIGHT);
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
      distance: SPACE_CAMERA.defaultDistance,
    });

    expect(position.x).toBeGreaterThan(0);
    expect(position.z).toBeCloseTo(0, 9);
  });

  it("주시점과의 거리는 피치와 무관하게 궤도 거리로 유지된다", () => {
    const focus = resolveCameraFocus(ORIGIN_PLAYER);

    for (const pitch of [SPACE_CAMERA.minPitch, SPACE_CAMERA.defaultPitch, SPACE_CAMERA.maxPitch]) {
      const position = resolveCameraPosition(ORIGIN_PLAYER, {
        yaw: 0.7,
        pitch,
        distance: SPACE_CAMERA.defaultDistance,
      });
      const distance = Math.hypot(position.x - focus.x, position.y - focus.y, position.z - focus.z);

      expect(distance).toBeCloseTo(SPACE_CAMERA.defaultDistance, 9);
    }
  });

  it("줌 거리가 그대로 카메라 거리에 반영된다", () => {
    const focus = resolveCameraFocus(ORIGIN_PLAYER);

    for (const distance of [SPACE_CAMERA.minDistance, 11, SPACE_CAMERA.maxDistance]) {
      const position = resolveCameraPosition(ORIGIN_PLAYER, {
        yaw: 0.4,
        pitch: SPACE_CAMERA.defaultPitch,
        distance,
      });

      expect(
        Math.hypot(position.x - focus.x, position.y - focus.y, position.z - focus.z),
      ).toBeCloseTo(distance, 9);
    }
  });

  it("피치를 내리면 카메라가 더 높이 올라간다", () => {
    const shallow = resolveCameraPosition(ORIGIN_PLAYER, {
      yaw: 0,
      pitch: SPACE_CAMERA.maxPitch,
      distance: SPACE_CAMERA.defaultDistance,
    });
    const steep = resolveCameraPosition(ORIGIN_PLAYER, {
      yaw: 0,
      pitch: SPACE_CAMERA.minPitch,
      distance: SPACE_CAMERA.defaultDistance,
    });

    expect(steep.y).toBeGreaterThan(shallow.y);
  });

  it("주시점은 플레이어를 따라가고 높이는 고정이다", () => {
    const focus = resolveCameraFocus({ x: 4, z: -9, y: 0, yaw: 2 });

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

describe("createDefaultCameraOrbit", () => {
  it("기본 거리는 아바타가 화면 높이의 약 16% 가 되는 11 m 다", () => {
    expect(createDefaultCameraOrbit(0).distance).toBe(SPACE_CAMERA.defaultDistance);
    expect(SPACE_CAMERA.defaultDistance).toBe(11);
  });

  it("시작 거리를 지정할 수 있다", () => {
    expect(createDefaultCameraOrbit(0, SPACE_CAMERA.touchInitialDistance).distance).toBe(
      SPACE_CAMERA.touchInitialDistance,
    );
  });

  it("지정한 시작 거리도 줌 범위로 자른다", () => {
    expect(createDefaultCameraOrbit(0, 999).distance).toBe(SPACE_CAMERA.maxDistance);
    expect(createDefaultCameraOrbit(0, 0).distance).toBe(SPACE_CAMERA.minDistance);
  });

  it("손가락 기기 시작 거리는 가장 멀리 물러난 값이다", () => {
    // 세로 화면은 세로 시야가 넓고 가로가 좁다. 물러나야 벽면 전체가 잡힌다.
    expect(SPACE_CAMERA.touchInitialDistance).toBe(SPACE_CAMERA.maxDistance);
  });
});

describe("clampCameraDistance", () => {
  it("줌 범위를 벗어나지 않는다", () => {
    expect(clampCameraDistance(0)).toBe(SPACE_CAMERA.minDistance);
    expect(clampCameraDistance(999)).toBe(SPACE_CAMERA.maxDistance);
    expect(clampCameraDistance(11)).toBe(11);
  });
});

describe("applyCameraZoom", () => {
  it("양수 입력은 멀어지고 음수 입력은 가까워진다", () => {
    const orbit = createDefaultCameraOrbit(0);

    expect(applyCameraZoom(orbit, 3).distance).toBe(SPACE_CAMERA.defaultDistance + 3);
    expect(applyCameraZoom(orbit, -3).distance).toBe(SPACE_CAMERA.defaultDistance - 3);
  });

  it("줌 범위 밖으로 나가지 않는다", () => {
    const orbit = createDefaultCameraOrbit(0);

    expect(applyCameraZoom(orbit, 999).distance).toBe(SPACE_CAMERA.maxDistance);
    expect(applyCameraZoom(orbit, -999).distance).toBe(SPACE_CAMERA.minDistance);
  });

  it("줌은 yaw 와 피치를 건드리지 않는다", () => {
    const orbit = { yaw: 1.2, pitch: -0.3, distance: 11 };
    const zoomed = applyCameraZoom(orbit, 4);

    expect(zoomed.yaw).toBe(orbit.yaw);
    expect(zoomed.pitch).toBe(orbit.pitch);
  });

  it("휠 한 노치(deltaY 100)는 약 1.2 m 를 움직인다", () => {
    expect(100 * SPACE_CAMERA.wheelZoomSensitivity).toBeCloseTo(1.2, 9);
  });
});

describe("회전 입력이 거리를 보존한다", () => {
  it("드래그는 거리를 바꾸지 않는다", () => {
    const orbit = { yaw: 0, pitch: SPACE_CAMERA.defaultPitch, distance: 14 };

    expect(applyCameraDrag(orbit, 120, -40).distance).toBe(14);
  });

  it("키보드 회전은 거리를 바꾸지 않는다", () => {
    const orbit = { yaw: 0, pitch: SPACE_CAMERA.defaultPitch, distance: 14 };

    expect(applyKeyboardYaw(orbit, 1, 0.5).distance).toBe(14);
  });
});

describe("clampCameraPosition", () => {
  it("수면 아래로 내려가지 않는다", () => {
    expect(clampCameraPosition({ x: 0, y: -5, z: 0 }).y).toBe(SPACE_CAMERA.minHeight);
    expect(SPACE_CAMERA.minHeight).toBeGreaterThan(SPACE_ISLAND.seaY);
  });

  it("궁전 꼭대기보다 높이 뜨지 않는다", () => {
    expect(clampCameraPosition({ x: 0, y: 500, z: 0 }).y).toBe(SPACE_CAMERA_BOUNDS.maxY);
  });

  it("사방 카메라 경계 밖으로 나가지 않는다", () => {
    const far = clampCameraPosition({ x: 500, y: 4, z: 500 });
    const near = clampCameraPosition({ x: -500, y: 4, z: -500 });

    expect(far.x).toBe(SPACE_CAMERA_BOUNDS.maxX);
    expect(far.z).toBe(SPACE_CAMERA_BOUNDS.maxZ);
    expect(near.x).toBe(SPACE_CAMERA_BOUNDS.minX);
    expect(near.z).toBe(SPACE_CAMERA_BOUNDS.minZ);
  });

  it("카메라 경계가 이동 경계보다 넓다", () => {
    // 플레이어가 경계에 붙으면 카메라는 그 밖으로 나가야 한다. 이동 경계로
    // 묶으면 카메라가 캐릭터 위로 올라탄다.
    expect(SPACE_CAMERA_BOUNDS.maxX).toBeGreaterThan(SPACE_BOUNDS.maxX);
    expect(SPACE_CAMERA_BOUNDS.minX).toBeLessThan(SPACE_BOUNDS.minX);
    expect(SPACE_CAMERA_BOUNDS.maxZ).toBeGreaterThan(SPACE_BOUNDS.maxZ);
    expect(SPACE_CAMERA_BOUNDS.minZ).toBeLessThan(SPACE_BOUNDS.minZ);
  });

  it("월드 안쪽 위치는 그대로 둔다", () => {
    const inside = { x: 3, y: 4, z: 6 };

    expect(clampCameraPosition(inside)).toEqual(inside);
  });

  it("최대 줌으로 궁전 단에 서도 카메라가 상자 안에 남는다", () => {
    // 섬은 벽이 아니라 지형이 카메라를 막는다(`IslandTerrain`). 이 상자는
    // 그 바깥에서 카메라가 한없이 멀어지지 않게 하는 마지막 가드다.
    const position = resolveCameraPosition(
      { x: 0, z: -26.25, y: SPACE_ISLAND.palaceY, yaw: 0 },
      { yaw: Math.PI, pitch: SPACE_CAMERA.defaultPitch, distance: SPACE_CAMERA.maxDistance },
    );

    expect(position.z).toBeLessThanOrEqual(SPACE_CAMERA_BOUNDS.maxZ);
    expect(position.z).toBeGreaterThanOrEqual(SPACE_CAMERA_BOUNDS.minZ);
    expect(position.y).toBeLessThanOrEqual(SPACE_CAMERA_BOUNDS.maxY);
  });
});
