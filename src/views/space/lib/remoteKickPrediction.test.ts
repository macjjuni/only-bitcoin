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

interface DelayedHitScenario {
  /** 맞은 사람 → 서버 지연(ms). 10 의 배수. */
  victimUplinkMs: number;
  /** 서버 → 보는 사람 지연(ms). 10 의 배수. */
  observerDownlinkMs: number;
  /** 공격 시작부터 보는 사람이 명중을 알게 되기까지(ms). */
  confirmedAt: number;
  /** 공격 시작부터 맞은 사람 화면에서 실제로 밀리기까지(ms). */
  victimImpactAt: number;
  /** 공격 시작 시각(ms). 걷는 상대는 수신 위치가 걷기 시작한 뒤에 맞아야 함. */
  startedAt?: number;
  /** 맞기 전부터 걷던 방향. 없으면 서 있음. */
  walkYaw?: number;
  /** 이 시각부터 걷기 입력을 뗌. */
  releasedAt?: number;
}

/**
 * 맞은 사람의 실제 이동을 서버 10Hz 틱과 보간기를 거쳐 보는 사람 화면까지 흘림.
 *
 * 맞은 사람 쪽 지연과 보는 사람 쪽 지연을 따로 둠. 둘이 같다고 두면 느린 상대를
 * 빠른 연결에서 볼 때 생기는 어긋남이 안 드러남.
 */
const runDelayedHit = (scenario: DelayedHitScenario) => {
  const terrain = createFlatTerrain(0);
  const stepMs = 1000 / 60;
  const target = { ...createPlayer(), isRunning: false };
  const interpolator = createSpaceInterpolator();
  interpolator.setPeers([target]);
  const sources = interpolator.sample(0);
  const displayed = [{ ...sources[0] }];
  const prediction = createRemoteKickPrediction();
  const walking = { ...createEmptyMovementInput(), forward: 1 };
  const idle = createEmptyMovementInput();
  const walkYaw = scenario.walkYaw ?? 0;
  const initial = createLocalPlayerState(target);
  if (scenario.walkYaw !== undefined) {
    initial.velocityX = -Math.sin(walkYaw) * 4.5;
    initial.velocityZ = -Math.cos(walkYaw) * 4.5;
  }
  const states = [initial];
  const startedAt = scenario.startedAt ?? 0;
  const impactStep = Math.round((startedAt + scenario.victimImpactAt) / stepMs);
  for (let step = 1; step <= 300; step += 1) {
    const previous =
      step === impactStep ? applyKnockback(states[step - 1], 1, 0) : states[step - 1];
    const isWalking =
      scenario.walkYaw !== undefined &&
      (scenario.releasedAt === undefined || step * stepMs < scenario.releasedAt);
    states.push(stepMovement(previous, isWalking ? walking : idle, walkYaw, 1 / 60, terrain));
  }
  const stateAt = (time: number) =>
    states[Math.min(states.length - 1, Math.max(0, Math.floor(time / stepMs)))];
  const frames: { now: number; x: number; z: number; sourceX: number; sourceZ: number }[] = [];
  const impactAt = startedAt + Math.max(280, scenario.confirmedAt);
  for (let now = 0; now <= 3600; now += 10) {
    const serverAt = now - scenario.observerDownlinkMs;
    if (serverAt >= 0 && serverAt % 100 === 0) {
      const state = stateAt(serverAt - scenario.victimUplinkMs);
      interpolator.pushSnapshot(
        { timestamp: serverAt, players: [{ ...target, x: state.x, y: state.y, z: state.z }] },
        now,
      );
    }
    interpolator.sample(now);
    if (now === startedAt + scenario.confirmedAt) {
      prediction.enqueue({
        player: sources[0],
        impactAt,
        dirX: 1,
        dirZ: 0,
        confirmationDelayMs: scenario.confirmedAt,
      });
    }
    prediction.update(sources, displayed, terrain, now);
    frames.push({
      now,
      x: displayed[0].x,
      z: displayed[0].z,
      sourceX: sources[0].x,
      sourceZ: sources[0].z,
    });
  }
  return { frames, impactAt, final: states[states.length - 1] };
};

/** 가장 멀리 간 뒤 되돌아온 누적 거리. */
const measurePullBack = (values: readonly number[]): number => {
  let peak = Number.NEGATIVE_INFINITY;
  let pullBack = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    pullBack = Math.max(pullBack, peak - value);
  }
  return pullBack;
};

const measureLargestStep = (values: readonly number[]): number =>
  values.reduce(
    (largest, value, index) =>
      index === 0 ? 0 : Math.max(largest, Math.abs(value - values[index - 1])),
    0,
  );

describe("원격 넉백 표시", () => {
  it.each([
    { victimUplinkMs: 150, victimImpactAt: 280 },
    { victimUplinkMs: 300, victimImpactAt: 280 },
    { victimUplinkMs: 300, victimImpactAt: 600 },
    { victimUplinkMs: 500, victimImpactAt: 600 },
  ])("맞은 사람만 느려도(송신 $victimUplinkMs ms, 적용 $victimImpactAt ms) 밀렸다가 되돌아오지 않음", (delays) => {
    const { frames, impactAt, final } = runDelayedHit({
      ...delays,
      observerDownlinkMs: 20,
      confirmedAt: 40,
    });
    const preview = frames.find((frame) => frame.x > 0.05);
    expect(preview?.now).toBeLessThanOrEqual(impactAt + 30);
    expect(measurePullBack(frames.map((frame) => frame.x))).toBeLessThan(0.05);
    expect(Math.max(...frames.map((frame) => frame.x))).toBeLessThan(final.x + 0.05);
    expect(frames[frames.length - 1].x).toBeCloseTo(final.x, 2);
  });

  it.each([
    { victimUplinkMs: 50, observerDownlinkMs: 20 },
    { victimUplinkMs: 300, observerDownlinkMs: 100 },
  ])("옆으로 걷던 상대는 걷던 쪽으로 계속 가고 따라잡느라 옆으로 미끄러지지 않음 ($victimUplinkMs ms)", (delays) => {
    // 걷는 방향(+z)은 밀리는 방향(+x)과 직각임.
    const { frames, impactAt } = runDelayedHit({
      ...delays,
      startedAt: 1000,
      confirmedAt: 60,
      victimImpactAt: 280,
      walkYaw: Math.PI,
    });
    const sideways = frames.map((frame) => frame.z);
    // 걷기 4.5 m/s 는 10 ms 에 0.045 m. 멈췄다가 몰아서 따라잡으면 이보다 큼.
    expect(measureLargestStep(sideways)).toBeLessThan(0.07);
    expect(measurePullBack(sideways)).toBeLessThan(0.05);
    expect(measurePullBack(frames.map((frame) => frame.x))).toBeLessThan(0.05);
    const preview = frames.find((frame) => frame.x - frame.sourceX > 0.05);
    expect(preview?.now).toBeLessThanOrEqual(impactAt + 30);
    const last = frames[frames.length - 1];
    expect(last.x).toBeCloseTo(last.sourceX, 5);
    expect(last.z).toBeCloseTo(last.sourceZ, 5);
  });

  it.each([
    { name: "도망가던", walkYaw: -Math.PI / 2 },
    { name: "다가오던", walkYaw: Math.PI / 2 },
  ])("$name 상대도 실제 넉백이 도착할 때 두 번 밀리거나 되돌아오지 않음", ({ walkYaw }) => {
    const { frames } = runDelayedHit({
      victimUplinkMs: 150,
      observerDownlinkMs: 50,
      startedAt: 1000,
      confirmedAt: 100,
      victimImpactAt: 280,
      walkYaw,
    });
    // 표시 위치가 수신 위치보다 앞서는 양. 맞은 직후 앞서고, 실제 넉백이 다 오면 0 임.
    const lead = frames.map((frame) => frame.x - frame.sourceX);
    expect(Math.max(...lead)).toBeGreaterThan(0.1);
    // 경직으로 덜 가는 거리까지 예측해서 수신 위치의 순간 튐보다 조금 뒤에 있을 수 있음.
    expect(Math.min(...lead)).toBeGreaterThan(-0.2);
    expect(Math.abs(lead[lead.length - 1])).toBeLessThan(1e-5);
    // 걷기 4.5 + 넉백 7 m/s 를 넘는 걸음이 없어야 함. 넘으면 두 번 밀렸거나 끊긴 것임.
    expect(measureLargestStep(frames.map((frame) => frame.x))).toBeLessThan(0.12);
  });

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
      // 표본 사이를 시각으로 이어서 0.001 ms 만큼(7 m/s 기준 0.007 mm)은 앞섬.
      expect(displayed.x).toBeCloseTo(actual.x, 4);
      expect(displayed.y).toBeCloseTo(actual.y, 4);
    }
    expect(displayed.x).toBeLessThan(1.1);
  });

  it("실제 넉백이 일부만 오면 나머지를 기다렸다가 넉백이 풀리던 모양대로 거둠", () => {
    const { source, displayed, update, hit } = createHarness();
    hit(0);
    update(0);
    const positions: number[] = [];
    for (let now = 20; now <= 2400; now += 20) {
      if (now >= 400) {
        source.x = 0.7;
      }
      update(now);
      positions.push(displayed.x);
      if (now === 1100) {
        // 아직 기다리는 중. 예측한 자리에 그대로 있음.
        expect(displayed.x).toBeGreaterThan(0.9);
      }
    }
    expect(Math.max(...positions)).toBeLessThan(1);
    expect(measureLargestStep(positions)).toBeLessThan(0.15);
    expect(displayed.x).toBe(source.x);
  });

  it("실제 넉백이 끝내 안 오면 1.2초 뒤 수신 위치로 돌아감", () => {
    const { source, displayed, update, hit } = createHarness();
    hit(0);
    for (let now = 0; now <= 1180; now += 20) {
      update(now);
    }
    expect(displayed.x).toBeGreaterThan(0.9);
    for (let now = 1200; now <= 2400; now += 20) {
      update(now);
    }
    expect(displayed.x).toBe(source.x);
    expect(displayed.y).toBe(source.y);
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

  it("서 있다 맞은 뒤 밀리는 쪽으로 걸어가면 기다리지 않고 수신 위치를 따라감", () => {
    const { source, displayed, prediction, update } = createHarness();
    prediction.enqueue({ player: source, impactAt: 0, dirX: 1, dirZ: 0, confirmationDelayMs: 400 });
    for (let now = 0; now <= 800; now += 20) {
      source.x = now * 0.002;
      update(now);
      expect(displayed.x).toBeGreaterThan(source.x - 0.05);
    }
    expect(displayed.x).toBeCloseTo(source.x, 5);
    expect(displayed.y).toBeCloseTo(source.y, 5);
  });

  it("같은 상대를 1초마다 계속 때려도 늦게 오는 실제 넉백과 어긋나지 않음", () => {
    const terrain = createFlatTerrain(0);
    const { source, displayed, update, hit } = createHarness(terrain);
    const idle = createEmptyMovementInput();
    const stepMs = 1000 / 60;
    const delayMs = 500;
    let actual = createLocalPlayerState(source);
    const actualPositions: number[] = [actual.x];
    for (let step = 1; step <= 420; step += 1) {
      if ((step - 1) % 60 === 0 && step <= 300) {
        actual = applyKnockback(actual, 1, 0);
      }
      actual = stepMovement(actual, idle, 0, 1 / 60, terrain);
      actualPositions.push(actual.x);
    }
    const positions: number[] = [];
    for (let step = 0; step <= 420; step += 1) {
      const now = step * stepMs;
      if (step % 60 === 0 && step < 300) {
        hit(now);
      }
      source.x = actualPositions[Math.max(0, step - Math.round(delayMs / stepMs))];
      update(now);
      positions.push(displayed.x);
      // 표시 위치는 지연 없는 실제 위치와 같아야 함.
      expect(displayed.x).toBeCloseTo(actualPositions[step], 2);
    }
    expect(measurePullBack(positions)).toBeLessThan(0.006);
    expect(displayed.x).toBe(source.x);
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
