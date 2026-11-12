import { describe, expect, it, vi } from "vitest";
import {
  createFlatTerrain,
  createLocalPlayerState,
  createSpaceInterpolator,
  type RemotePlayer,
  type SpaceTerrain,
} from "@/entities/space";
import { applyKnockback, createEmptyMovementInput, stepMovement } from "@/features/space-controls";
import { createRemoteKickPrediction } from "./remoteKickPrediction";

const createPlayer = (): RemotePlayer => ({
  seat: 1,
  nickname: "상대",
  modelIndex: 0,
  colorIndex: 0,
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
});

const createHarness = (terrain: SpaceTerrain = createFlatTerrain(0)) => {
  const source = createPlayer();
  const displayed = { ...source };
  const prediction = createRemoteKickPrediction();
  const update = (now: number) => prediction.update([source], [displayed], terrain, now);
  const hit = (impactAt: number, dirX = 1) =>
    prediction.enqueue({ player: source, impactAt, dirX, dirZ: 0 });
  return { source, displayed, prediction, update, hit };
};

describe("원격 넉백 표시", () => {
  it.each([
    100, 200, 400,
  ])("왕복 %dms와 10Hz 위치 보간에서도 먼저 반응하고 수신 위치에 합류함", (roundTripMs) => {
    const terrain = createFlatTerrain(0);
    const target = { ...createPlayer(), isRunning: false };
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([target]);
    const sources = interpolator.sample(0);
    const displayed = [{ ...sources[0] }];
    const prediction = createRemoteKickPrediction();
    const impactAt = Math.max(280, roundTripMs);
    const idle = createEmptyMovementInput();
    const states = [createLocalPlayerState(target)];
    for (let step = 1; step <= 250; step += 1) {
      const previous =
        step * 10 === impactAt ? applyKnockback(states[step - 1], 1, 0) : states[step - 1];
      states.push(stepMovement(previous, idle, 0, 0.01, terrain));
    }
    let firstPreviewAt = Number.POSITIVE_INFINITY;
    let firstSnapshotMotionAt = Number.POSITIVE_INFINITY;
    let previousX = 0;
    let largestBackwardStep = 0;
    let peakX = 0;
    let largestPullBack = 0;
    for (let now = 0; now <= 2200; now += 10) {
      const serverAt = now - roundTripMs / 2;
      if (serverAt >= 0 && serverAt % 100 === 0) {
        const sourceAt = Math.max(0, serverAt - roundTripMs / 2);
        interpolator.pushSnapshot(
          { timestamp: serverAt, players: [{ ...target, ...states[Math.floor(sourceAt / 10)] }] },
          now,
        );
      }
      interpolator.sample(now);
      if (now === roundTripMs) {
        prediction.enqueue({
          player: sources[0],
          impactAt,
          dirX: 1,
          dirZ: 0,
          confirmationDelayMs: roundTripMs,
        });
      }
      prediction.update(sources, displayed, terrain, now);
      if (displayed[0].x > 0.05) {
        firstPreviewAt = Math.min(firstPreviewAt, now);
      }
      if (sources[0].x > 0.05) {
        firstSnapshotMotionAt = Math.min(firstSnapshotMotionAt, now);
      }
      largestBackwardStep = Math.max(largestBackwardStep, previousX - displayed[0].x);
      previousX = displayed[0].x;
      peakX = Math.max(peakX, displayed[0].x);
      largestPullBack = Math.max(largestPullBack, peakX - displayed[0].x);
      expect(displayed[0].x).toBeLessThan(1.05);
    }
    expect(firstPreviewAt).toBeLessThanOrEqual(impactAt + 30);
    expect(firstPreviewAt).toBeLessThan(firstSnapshotMotionAt);
    expect(largestBackwardStep).toBeLessThan(0.04);
    // 밀렸다가 뒤로 되돌아오는 거리. 걸음 단위가 아니라 누적으로 봄.
    expect(largestPullBack).toBeLessThan(0.05);
    expect(displayed[0].x).toBeCloseTo(sources[0].x, 5);
  });

  it.each([
    0, 100, 200, 400,
  ])("숨은 탭 상대가 맞자마자 최종 위치를 보내도(왕복 %dms) 더 밀렸다가 되돌아오지 않음", (roundTripMs) => {
    const terrain = createFlatTerrain(0);
    const target = { ...createPlayer(), isRunning: false };
    const interpolator = createSpaceInterpolator();
    interpolator.setPeers([target]);
    const sources = interpolator.sample(0);
    const displayed = [{ ...sources[0] }];
    const prediction = createRemoteKickPrediction();
    const idle = createEmptyMovementInput();
    let finalState = applyKnockback(createLocalPlayerState(target), 1, 0);
    for (let step = 0; step < 120; step += 1) {
      finalState = stepMovement(finalState, idle, 0, 1 / 60, terrain);
    }
    const impactAt = Math.max(280, roundTripMs);
    let peakX = 0;
    let largestPullBack = 0;
    let previousX = 0;
    let largestStep = 0;
    for (let now = 0; now <= 2200; now += 10) {
      const serverAt = now - roundTripMs / 2;
      if (serverAt >= 0 && serverAt % 100 === 0) {
        // 숨은 탭은 공격을 받은 순간(서버 시각 roundTripMs) 최종 위치를 한 번에 보냄.
        const state = serverAt >= roundTripMs ? finalState : createLocalPlayerState(target);
        interpolator.pushSnapshot(
          { timestamp: serverAt, players: [{ ...target, x: state.x, y: state.y, z: state.z }] },
          now,
        );
      }
      interpolator.sample(now);
      if (now === roundTripMs) {
        prediction.enqueue({
          player: sources[0],
          impactAt,
          dirX: 1,
          dirZ: 0,
          confirmationDelayMs: roundTripMs,
        });
      }
      prediction.update(sources, displayed, terrain, now);
      // 넉백 첫 적분 한 걸음(7 m/s ÷ 60)보다 크게 움직이면 뚝 끊겨 보임.
      largestStep = Math.max(largestStep, Math.abs(displayed[0].x - previousX));
      previousX = displayed[0].x;
      if (now < impactAt) {
        expect(displayed[0].x).toBe(0);
      }
      if (now === impactAt + 100) {
        expect(displayed[0].y).toBeGreaterThan(0);
      }
      peakX = Math.max(peakX, displayed[0].x);
      largestPullBack = Math.max(largestPullBack, peakX - displayed[0].x);
    }
    expect(largestStep).toBeLessThan(0.12);
    expect(peakX).toBeLessThan(finalState.x + 0.05);
    expect(largestPullBack).toBeLessThan(0.05);
    expect(displayed[0].x).toBeCloseTo(finalState.x, 5);
  });

  it("위치 패킷이 없어도 타격 시점부터 밀리고 보간기 원본은 변경하지 않음", () => {
    const { source, displayed, update, hit } = createHarness();
    hit(280);
    update(200);
    expect(displayed.x).toBe(0);
    update(280);
    update(314);
    expect(displayed.x).toBeGreaterThan(0.1);
    expect(displayed.y).toBeGreaterThan(0);
    expect(source).toEqual(createPlayer());
  });

  it("동일한 실제 넉백 위치가 도착해도 변위를 더하지 않고 일치하는 위치를 유지함", () => {
    const { source, displayed, update, hit } = createHarness();
    const idle = createEmptyMovementInput();
    const terrain = createFlatTerrain(0);
    let actual = applyKnockback(createLocalPlayerState(source), 1, 0);
    hit(0);
    update(0);
    for (let index = 1; index <= 40; index += 1) {
      actual = stepMovement(actual, idle, 0, 1 / 60, terrain);
      Object.assign(source, { x: actual.x, y: actual.y, z: actual.z });
      update(index * (1000 / 60) + 0.001);
      expect(displayed.x).toBeCloseTo(actual.x, 5);
      expect(displayed.y).toBeCloseTo(actual.y, 5);
    }
    expect(displayed.x).toBeLessThan(1.1);
  });

  it("지연된 위치를 받으면 650ms 안에 수신 위치로 부드럽게 복귀함", () => {
    const { source, displayed, update, hit } = createHarness();
    hit(0);
    update(0);
    let previousX = 0;
    let largestStep = 0;
    for (let now = 20; now <= 700; now += 20) {
      if (now >= 400) {
        source.x = 0.7;
      }
      update(now);
      largestStep = Math.max(largestStep, Math.abs(displayed.x - previousX));
      previousX = displayed.x;
    }
    expect(largestStep).toBeLessThan(0.21);
    expect(displayed.x).toBe(source.x);
  });

  it("벽에 막힌 예측은 벽을 통과하지 않음", () => {
    const terrain: SpaceTerrain = {
      ...createFlatTerrain(0),
      resolveMove: (x, z) => ({ x: Math.min(0.2, x), z, pushX: x > 0.2 ? -1 : 0, pushZ: 0 }),
    };
    const { displayed, update, hit } = createHarness(terrain);
    hit(0);
    for (let now = 0; now <= 400; now += 20) {
      update(now);
      expect(displayed.x).toBeLessThanOrEqual(0.2);
    }
  });

  it("실제 위치가 먼저 따라오면 느린 연결용 대기 시간을 채우지 않고 계속 걷는 상대를 따라감", () => {
    const { source, displayed, prediction, update } = createHarness();
    prediction.enqueue({ player: source, impactAt: 0, dirX: 1, dirZ: 0, confirmationDelayMs: 400 });
    for (let now = 0; now <= 700; now += 20) {
      source.x = now * 0.002;
      update(now);
    }
    expect(displayed.x).toBeCloseTo(source.x, 5);
    expect(displayed.y).toBeCloseTo(source.y, 5);
  });

  it("서로 반대인 연속 타격도 속도 상한 안에서 처리함", () => {
    const { displayed, update, hit } = createHarness();
    hit(0);
    update(0);
    update(50);
    hit(50, -1);
    update(50);
    for (let now = 70; now <= 400; now += 20) {
      update(now);
      expect(Math.abs(displayed.x)).toBeLessThan(2);
    }
  });

  it("퇴장과 좌석 재사용, 탭 정지, 세션 초기화 때 지난 충격을 남기지 않음", () => {
    const { source, displayed, prediction, update, hit } = createHarness();
    hit(0);
    update(0);
    update(40);
    const replacement = { ...source, nickname: "새 사람" };
    prediction.update([replacement], [displayed], createFlatTerrain(0), 60);
    expect(displayed.x).toBe(0);
    hit(100);
    update(2000);
    expect(displayed.x).toBe(0);
    hit(2100);
    prediction.clear();
    update(2200);
    expect(displayed.x).toBe(0);
  });

  it("공격이 없으면 지형 질의를 추가하지 않음", () => {
    const terrain = createFlatTerrain(0);
    const resolveMove = vi.spyOn(terrain, "resolveMove");
    const resolveGroundY = vi.spyOn(terrain, "resolveGroundY");
    const { update } = createHarness(terrain);
    for (let now = 0; now <= 1000; now += 20) {
      update(now);
    }
    expect(resolveMove).not.toHaveBeenCalled();
    expect(resolveGroundY).not.toHaveBeenCalled();
  });
});
