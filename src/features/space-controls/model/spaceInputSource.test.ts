import { describe, expect, it } from "vitest";
import {
  consumePendingDrag,
  createSpaceInputSource,
  resolveMergedMovementInput,
} from "@/features/space-controls/model/spaceInputSource";

describe("resolveMergedMovementInput", () => {
  it("아무 입력이 없으면 정지 상태다", () => {
    expect(resolveMergedMovementInput(createSpaceInputSource())).toEqual({
      forward: 0,
      strafe: 0,
      isRunning: false,
      isJumping: false,
    });
  });

  it("조이스틱의 부분 기울기를 그대로 전달한다", () => {
    const inputSource = createSpaceInputSource();
    inputSource.joystick.forward = 0.4;
    inputSource.joystick.strafe = -0.25;

    expect(resolveMergedMovementInput(inputSource)).toEqual({
      forward: 0.4,
      strafe: -0.25,
      isRunning: false,
      isJumping: false,
    });
  });

  it("두 채널을 합친 뒤 축마다 -1 ~ 1 로 깎는다", () => {
    const inputSource = createSpaceInputSource();
    inputSource.keyboard.forward = 1;
    inputSource.joystick.forward = 0.8;
    inputSource.keyboard.strafe = -1;
    inputSource.joystick.strafe = -0.5;

    expect(resolveMergedMovementInput(inputSource)).toMatchObject({ forward: 1, strafe: -1 });
  });

  it("반대 방향 입력은 서로 상쇄한다", () => {
    const inputSource = createSpaceInputSource();
    inputSource.keyboard.forward = 1;
    inputSource.joystick.forward = -1;

    expect(resolveMergedMovementInput(inputSource).forward).toBe(0);
  });

  it("어느 채널이든 달리기면 달린다", () => {
    const inputSource = createSpaceInputSource();
    inputSource.joystick.isRunning = true;

    expect(resolveMergedMovementInput(inputSource).isRunning).toBe(true);
  });
});

describe("consumePendingDrag", () => {
  it("누적된 드래그량을 돌려준다", () => {
    const inputSource = createSpaceInputSource();
    inputSource.pendingDragX = 12;
    inputSource.pendingDragY = -4;

    expect(consumePendingDrag(inputSource)).toEqual({ deltaX: 12, deltaY: -4 });
  });

  it("한 번 소비하면 비워져 두 프레임에 걸쳐 적용되지 않는다", () => {
    const inputSource = createSpaceInputSource();
    inputSource.pendingDragX = 12;
    inputSource.pendingDragY = -4;

    consumePendingDrag(inputSource);

    expect(consumePendingDrag(inputSource)).toEqual({ deltaX: 0, deltaY: 0 });
  });
});
