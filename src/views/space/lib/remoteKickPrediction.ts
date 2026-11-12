import {
  createLocalPlayerState,
  type LocalPlayerState,
  type RemotePlayer,
  SPACE_KICK,
  type SpaceTerrain,
} from "@/entities/space";
import {
  applyKnockback,
  createEmptyMovementInput,
  type MovementInput,
  SPACE_MOVEMENT,
  stepMovement,
} from "@/features/space-controls";

const stepMs = SPACE_MOVEMENT.fixedTimeStep * 1000;
/** 타격 시각을 이만큼 넘겨 처리하게 되면(탭 정지 등) 지난 연출이라 버림. */
const staleImpactMs = 400;
/**
 * 실제 넉백이 수신 위치에 나타나기를 기다리는 시간. 넘기면 안 온 것으로 보고 거둠.
 *
 * 맞은 사람의 수신·송신 지연 + 서버 틱 + 보간 지연이라 맞은 사람 연결에 달렸음.
 * 보는 사람의 확인 지연만으로 정하면 느린 상대를 빠른 연결에서 볼 때 모자람.
 */
const awaitActualMs = 1200;
const maximumOffsetMeters = 3;
/** 예측이 끝나고 남은 차이가 이보다 작으면 수신 위치로 넘김. 넘길 때 이만큼은 튐. */
const settledOffsetMeters = 0.005;
/** 넉백·경직이 풀릴 때까지 미리 적분하는 스텝 상한(1.5 초). */
const maximumCurveSteps = 90;
/** 한 프레임에 이보다 적게 움직였으면 서 있던 것으로 봄. */
const stationaryStepMeters = 0.01;
/** 타격을 기다리는 동안 옆·반대쪽으로 이만큼 갔으면 스스로 움직인 것으로 봄. */
const ownMovementMeters = 0.15;
/** 이보다 느리면 걷던 속도로 안 침. 보간 떨림을 걷기로 읽지 않음. */
const minimumOwnSpeed = 0.5;
/** 프레임 간격이 이보다 길면 직전 프레임과의 차이로 속도를 못 구함. */
const maximumVelocitySampleMs = 100;

interface PendingImpact {
  player: RemotePlayer;
  impactAt: number;
  dirX: number;
  dirZ: number;
  /** 공격 시작부터 내가 알게 되기까지 걸린 시간. 느린 연결은 실제 위치를 더 오래 기다림. */
  confirmationDelayMs?: number;
  /** 큐에 넣은 프레임의 위치. 첫 update 가 채움. */
  queuedX?: number;
  queuedZ?: number;
  wasStationary?: boolean;
}

/**
 * 맞은 사람 하나의 예측.
 *
 * 배열들은 고정 스텝마다의 표본이고 i 번째가 `startedAt` + i 스텝 시각임.
 * `offsets` 는 **맞아서 생긴 변위**(넉백 + 경직으로 덜 간 거리)만 담음. 걷던 속도로
 * 그대로 갔을 때와의 차이라 서 있던 상대는 넉백 궤적 그대로임.
 */
interface PredictedImpact {
  player: RemotePlayer;
  startedAt: number;
  /** 연속 타격 때 이어서 적분하려고 남겨 둠. */
  states: LocalPlayerState[];
  offsetsX: number[];
  offsetsZ: number[];
  /** 맞아서 뜬 높이. 지형과 무관하게 따로 적분함. */
  hops: number[];
  hopVelocities: number[];
  /** 수신 위치에 이미 들어온 만큼. 표본 번호 단위이고 뒤로 안 감. */
  consumed: number;
  /** 직전 프레임의 수신 위치와 시각. */
  sourceX: number;
  sourceZ: number;
  sampledAt: number;
  /** 맞기 전 걷던 속도(m/s). 서 있었으면 0. */
  ownVelocityX: number;
  ownVelocityZ: number;
  /** 걷던 방향을 계속 누르고 있다고 보고 넣는 입력. */
  input: MovementInput;
  inputYaw: number;
  originY: number;
  awaitMs: number;
  /** 서 있던 상대만 실제 위치가 예측보다 앞설 수 있음(숨은 탭). */
  canArriveEarly: boolean;
}

const sampleCurve = (values: readonly number[], position: number): number => {
  const index = Math.min(values.length - 1, Math.max(0, Math.floor(position)));
  const next = Math.min(values.length - 1, index + 1);
  const progress = Math.min(1, Math.max(0, position - index));

  return values[index] + (values[next] - values[index]) * progress;
};

/**
 * 넉백과 경직이 풀릴 때까지 궤적을 미리 적분해 붙임.
 *
 * 벽·바닥 판정은 실제 이동과 같은 적분기를 씀. 맞을 때 한 번만 돌고 그 뒤 프레임은
 * 표본만 읽음.
 */
const extendCurve = (prediction: PredictedImpact, terrain: SpaceTerrain): void => {
  const { states, offsetsX, offsetsZ, hops, hopVelocities, ownVelocityX, ownVelocityZ } =
    prediction;
  const deltaSeconds = SPACE_MOVEMENT.fixedTimeStep;
  let state = states[states.length - 1];
  let hop = hops[hops.length - 1];
  let hopVelocity = hopVelocities[hopVelocities.length - 1];

  for (let step = 0; step < maximumCurveSteps; step += 1) {
    const isSettled =
      state.knockbackX === 0 &&
      state.knockbackZ === 0 &&
      hop === 0 &&
      hopVelocity <= 0 &&
      Math.hypot(state.velocityX - ownVelocityX, state.velocityZ - ownVelocityZ) < 0.05;

    if (isSettled) {
      return;
    }
    const next = stepMovement(state, prediction.input, prediction.inputYaw, deltaSeconds, terrain);

    if (hop > 0 || hopVelocity > 0) {
      hopVelocity -= SPACE_MOVEMENT.gravity * deltaSeconds;
      hop += hopVelocity * deltaSeconds;
      if (hop <= 0) {
        hop = 0;
        hopVelocity = 0;
      }
    }
    offsetsX.push(offsetsX[offsetsX.length - 1] + next.x - state.x - ownVelocityX * deltaSeconds);
    offsetsZ.push(offsetsZ[offsetsZ.length - 1] + next.z - state.z - ownVelocityZ * deltaSeconds);
    hops.push(hop);
    hopVelocities.push(hopVelocity);
    states.push(next);
    state = next;
  }
};

/**
 * `from` 부터 앞으로만 가며 궤적에서 `(x, z)` 에 가장 가까운 자리를 찾음.
 *
 * 멀어지기 시작하면 멈춤. 궤적 전체에서 찾으면 반대로 연달아 맞아 되돌아온 궤적의
 * 뒤쪽 구간으로 건너뜀.
 */
const projectOntoCurve = (
  prediction: PredictedImpact,
  x: number,
  z: number,
  from: number,
  to: number,
): number => {
  const { offsetsX, offsetsZ } = prediction;
  let best = from;
  let bestDistance =
    (sampleCurve(offsetsX, from) - x) ** 2 + (sampleCurve(offsetsZ, from) - z) ** 2;
  const lastSegment = Math.min(offsetsX.length - 2, Math.floor(to));

  for (let index = Math.floor(from); index <= lastSegment; index += 1) {
    const minimum = Math.max(0, from - index);
    const maximum = Math.min(1, to - index);

    if (maximum < minimum) {
      continue;
    }
    const spanX = offsetsX[index + 1] - offsetsX[index];
    const spanZ = offsetsZ[index + 1] - offsetsZ[index];
    const spanLength = spanX * spanX + spanZ * spanZ;
    const along =
      spanLength > 0
        ? ((x - offsetsX[index]) * spanX + (z - offsetsZ[index]) * spanZ) / spanLength
        : minimum;
    const progress = Math.min(maximum, Math.max(minimum, along));
    const distance =
      (offsetsX[index] + spanX * progress - x) ** 2 + (offsetsZ[index] + spanZ * progress - z) ** 2;

    if (distance < bestDistance) {
      bestDistance = distance;
      best = index + progress;
    } else if (distance > bestDistance + 1e-9) {
      break;
    }
  }
  return best;
};

/**
 * 서버가 확인한 명중을 맞은 사람의 위치 패킷보다 먼저 보여줌. 찬 사람이 누구든 같음.
 *
 * 보간기의 원본 좌표에는 손대지 않는다. 표시 위치는 **수신 위치 + 아직 수신 위치에
 * 안 들어온 넉백**이다. 맞을 때 궤적을 미리 적분해 두고, 수신 위치가 그 궤적을 따라
 * 움직인 만큼을 "이미 들어온 것"으로 빼서 실제 넉백이 도착해도 두 번 밀리지 않는다.
 *
 * - 정해 둔 시간 뒤에 수신 위치로 되돌리지 않는다. 실제 넉백은 맞은 사람의 연결만큼
 *   늦게 오는데, 그 전에 되돌리면 밀렸다가 돌아온 뒤 다시 밀린다. 실제 넉백이 다
 *   들어오면 차이가 0 이 되어 그대로 끝난다. 1.2 초(+ 확인 지연, 최대 0.5 초)가
 *   지나도 안 오면 그때 거둔다.
 * - 수신 위치를 그대로 따라가므로 걷던 상대는 계속 걷는다. 예측 위치에 세워 두면
 *   그사이 걸어간 만큼을 나중에 옆으로 미끄러지며 따라잡았다.
 * - 걷던 상대는 걷던 속도를 뺀 나머지만 넉백으로 본다. 맞으면 잠깐 조작이 안 먹어
 *   덜 가는 거리도 궤적에 넣는다.
 * - 숨은 탭은 맞자마자 최종 위치를 한 번에 보내서 타격 시각보다 먼저 도착할 수 있다.
 *   서 있던 상대는 타격 시각까지 맞기 전 자리에 세워 두고, 먼저 온 위치는 이미
 *   들어온 넉백으로 쳐서 그 자리에서 같은 동작으로 밀리게 한다.
 * - 평상시에는 좌표 복사만 하고, 지형 연산은 맞는 순간에만 수행한다.
 */
export const createRemoteKickPrediction = () => {
  const pendingImpacts: PendingImpact[] = [];
  const impactsBySeat = new Map<number, PredictedImpact>();
  /** 타격을 기다리는 동안 맞기 전 자리에 세워 둘 좌석. 매 update 다시 채움. */
  const heldPositionsBySeat = new Map<number, PendingImpact>();
  let lastUpdatedAt: number | undefined;

  const clear = (): void => {
    pendingImpacts.length = 0;
    impactsBySeat.clear();
    heldPositionsBySeat.clear();
    lastUpdatedAt = undefined;
  };

  const enqueue = (impact: PendingImpact): void => {
    // 서버 큐와 같은 크기로 제한. 탭 정지·퇴장 때 남은 연출은 update에서 폐기함.
    if (pendingImpacts.length < 32) {
      pendingImpacts.push(impact);
    }
  };

  /** 직전 프레임과의 차이로 걷던 속도를 구함. 못 구하면 서 있던 것으로 봄. */
  const resolveOwnVelocity = (
    player: RemotePlayer,
    lastFrame: RemotePlayer | undefined,
    now: number,
  ): { x: number; z: number } => {
    const elapsedMs = lastUpdatedAt === undefined ? 0 : now - lastUpdatedAt;

    if (!lastFrame || elapsedMs <= 0 || elapsedMs > maximumVelocitySampleMs) {
      return { x: 0, z: 0 };
    }
    const velocityX = ((player.x - lastFrame.x) / elapsedMs) * 1000;
    const velocityZ = ((player.z - lastFrame.z) / elapsedMs) * 1000;
    const speed = Math.hypot(velocityX, velocityZ);

    if (speed < minimumOwnSpeed) {
      return { x: 0, z: 0 };
    }
    const scale = Math.min(1, SPACE_MOVEMENT.runSpeed / speed);

    return { x: velocityX * scale, z: velocityZ * scale };
  };

  const startPrediction = (
    impact: PendingImpact,
    lastFrame: RemotePlayer | undefined,
    awaitMs: number,
    terrain: SpaceTerrain,
    now: number,
  ): PredictedImpact => {
    const { player } = impact;
    // 서 있던 상대는 맞기 전 자리에서 시작함. 먼저 온 실제 넉백 위에 더하지 않음.
    const isStationary =
      impact.wasStationary === true && impact.queuedX !== undefined && impact.queuedZ !== undefined;
    const x = isStationary ? (impact.queuedX ?? player.x) : player.x;
    const z = isStationary ? (impact.queuedZ ?? player.z) : player.z;
    const ownVelocity = isStationary ? { x: 0, z: 0 } : resolveOwnVelocity(player, lastFrame, now);
    const ownSpeed = Math.hypot(ownVelocity.x, ownVelocity.z);
    const isRunning = ownSpeed > SPACE_MOVEMENT.walkSpeed;
    const state = createLocalPlayerState({ x, y: player.y, z, yaw: player.yaw });

    state.velocityX = ownVelocity.x;
    state.velocityZ = ownVelocity.z;
    state.isGrounded = Math.abs(state.y - terrain.resolveGroundY(x, z, state.y)) < 0.2;

    const prediction: PredictedImpact = {
      player,
      startedAt: now,
      states: [applyKnockback(state, impact.dirX, impact.dirZ)],
      offsetsX: [0],
      offsetsZ: [0],
      hops: [0],
      hopVelocities: [state.isGrounded ? SPACE_KICK.knockbackHopSpeed : 0],
      consumed: 0,
      sourceX: x,
      sourceZ: z,
      sampledAt: now,
      ownVelocityX: ownVelocity.x,
      ownVelocityZ: ownVelocity.z,
      // 입력 크기를 걷던 속도에 맞춰 경직이 풀린 뒤 같은 속도로 돌아가게 함.
      input: {
        ...createEmptyMovementInput(),
        forward: ownSpeed / (isRunning ? SPACE_MOVEMENT.runSpeed : SPACE_MOVEMENT.walkSpeed),
        isRunning,
      },
      inputYaw: Math.atan2(-ownVelocity.x, -ownVelocity.z),
      originY: player.y,
      awaitMs,
      canArriveEarly: isStationary,
    };

    extendCurve(prediction, terrain);
    return prediction;
  };

  /** 예측이 남아 있는 상대가 또 맞음. 지금 시각에서 궤적을 끊고 넉백을 더해 다시 이음. */
  const strikeAgain = (
    prediction: PredictedImpact,
    impact: PendingImpact,
    lastFrame: RemotePlayer | undefined,
    awaitMs: number,
    terrain: SpaceTerrain,
    now: number,
  ): void => {
    const { states, offsetsX, offsetsZ, hops, hopVelocities } = prediction;
    const elapsedSteps = Math.floor((now - prediction.startedAt) / stepMs);
    const lastIndex = states.length - 1;
    const index = Math.min(lastIndex, Math.max(0, elapsedSteps));

    if (elapsedSteps > lastIndex) {
      // 궤적이 끝난 뒤 맞았음. 마지막 표본이 지금 시각이 되게 당김.
      prediction.startedAt += (elapsedSteps - lastIndex) * stepMs;
    }
    if (prediction.consumed > index) {
      // 잘려 나갈 구간까지 이미 들어와 있었음. 남는 만큼은 다음 프레임에 다시 셈.
      prediction.sourceX -= sampleCurve(offsetsX, prediction.consumed) - offsetsX[index];
      prediction.sourceZ -= sampleCurve(offsetsZ, prediction.consumed) - offsetsZ[index];
      prediction.consumed = index;
    }
    for (const samples of [states, offsetsX, offsetsZ, hops, hopVelocities]) {
      samples.length = index + 1;
    }
    // 연달아 맞아도 표본이 끝없이 쌓이지 않게 이미 들어온 앞부분을 버림.
    const dropped = Math.floor(prediction.consumed);
    if (dropped > 0) {
      for (const samples of [states, offsetsX, offsetsZ, hops, hopVelocities]) {
        samples.splice(0, dropped);
      }
      prediction.startedAt += dropped * stepMs;
      prediction.consumed -= dropped;
    }

    const head = states.length - 1;
    const isGrounded = hops[head] === 0;
    // 걷던 상대는 적분 위치가 실제와 벌어져 있음. 벽 판정이 맞게 화면 위치로 옮김.
    const struck: LocalPlayerState = {
      ...states[head],
      x: lastFrame?.x ?? states[head].x,
      y: impact.player.y,
      z: lastFrame?.z ?? states[head].z,
      isGrounded,
    };

    if (isGrounded) {
      hopVelocities[head] = SPACE_KICK.knockbackHopSpeed;
    }
    states[head] = applyKnockback(struck, impact.dirX, impact.dirZ);
    prediction.awaitMs = Math.max(prediction.awaitMs, awaitMs);
    extendCurve(prediction, terrain);
  };

  const update = (
    players: readonly RemotePlayer[],
    displayedPlayers: readonly RemotePlayer[],
    terrain: SpaceTerrain,
    now: number,
  ): void => {
    heldPositionsBySeat.clear();
    for (let index = pendingImpacts.length - 1; index >= 0; index -= 1) {
      const impact = pendingImpacts[index];
      // 표시 좌표에는 아직 지난 프레임 값이 남아 있어 그 차이로 움직임을 봄.
      const lastFrame = displayedPlayers.find((player) => player.seat === impact.player.seat);
      if (impact.queuedX === undefined || impact.queuedZ === undefined) {
        impact.queuedX = impact.player.x;
        impact.queuedZ = impact.player.z;
        impact.wasStationary =
          lastFrame !== undefined &&
          !impactsBySeat.has(impact.player.seat) &&
          Math.hypot(impact.player.x - lastFrame.x, impact.player.z - lastFrame.z) <
            stationaryStepMeters;
      }
      const directionLength = Math.hypot(impact.dirX, impact.dirZ) || 1;
      const movedX = impact.player.x - impact.queuedX;
      const movedZ = impact.player.z - impact.queuedZ;
      const movedAlong = (movedX * impact.dirX + movedZ * impact.dirZ) / directionLength;
      const movedAside = Math.abs(movedX * impact.dirZ - movedZ * impact.dirX) / directionLength;
      // 옆이나 반대쪽으로 갔으면 스스로 걷기 시작한 것임. 붙잡지 않음.
      if (movedAside > ownMovementMeters || movedAlong < -ownMovementMeters) {
        impact.wasStationary = false;
      }
      if (impact.impactAt > now) {
        if (impact.wasStationary) {
          heldPositionsBySeat.set(impact.player.seat, impact);
        }
        continue;
      }
      pendingImpacts.splice(index, 1);
      if (!players.includes(impact.player) || now - impact.impactAt > staleImpactMs) {
        continue;
      }
      const awaitMs = awaitActualMs + Math.min(500, Math.max(0, impact.confirmationDelayMs ?? 0));
      const previous = impactsBySeat.get(impact.player.seat);

      if (previous) {
        strikeAgain(previous, impact, lastFrame, awaitMs, terrain, now);
      } else {
        impactsBySeat.set(
          impact.player.seat,
          startPrediction(impact, lastFrame, awaitMs, terrain, now),
        );
      }
    }

    for (const [seat, prediction] of impactsBySeat) {
      if (!players.includes(prediction.player)) {
        impactsBySeat.delete(seat);
      }
    }

    for (let index = 0; index < players.length; index += 1) {
      const source = players[index];
      const displayed = displayedPlayers[index];
      if (!displayed) {
        continue;
      }
      Object.assign(displayed, source);
      const prediction = impactsBySeat.get(source.seat);
      if (!prediction) {
        const held =
          heldPositionsBySeat.size > 0 ? heldPositionsBySeat.get(source.seat) : undefined;
        if (held?.queuedX !== undefined && held.queuedZ !== undefined) {
          displayed.x = held.queuedX;
          displayed.z = held.queuedZ;
        }
        continue;
      }

      const { offsetsX, offsetsZ, hops } = prediction;
      const lastIndex = offsetsX.length - 1;
      const position = (now - prediction.startedAt) / stepMs;
      const time = Math.min(lastIndex, Math.max(0, position));
      // 걷던 속도로 간 만큼을 뺀 수신 위치의 움직임을 궤적 위로 옮겨 봄.
      const elapsedSeconds = Math.max(0, now - prediction.sampledAt) / 1000;
      const movedX = source.x - prediction.sourceX - prediction.ownVelocityX * elapsedSeconds;
      const movedZ = source.z - prediction.sourceZ - prediction.ownVelocityZ * elapsedSeconds;
      const arrived = projectOntoCurve(
        prediction,
        sampleCurve(offsetsX, prediction.consumed) + movedX,
        sampleCurve(offsetsZ, prediction.consumed) + movedZ,
        prediction.consumed,
        // 걷던 상대는 예측보다 앞서 들어올 수 없음. 스스로 빨라진 것을 넉백으로 읽지 않음.
        prediction.canArriveEarly ? lastIndex : Math.max(prediction.consumed, time),
      );
      // 기다려도 안 온 구간은 들어온 것으로 쳐서 넉백이 풀리던 모양대로 거둠.
      prediction.consumed = Math.max(
        arrived,
        Math.min(lastIndex, position - prediction.awaitMs / stepMs),
      );
      prediction.sourceX = source.x;
      prediction.sourceZ = source.z;
      prediction.sampledAt = now;

      const offsetX = sampleCurve(offsetsX, time) - sampleCurve(offsetsX, prediction.consumed);
      const offsetZ = sampleCurve(offsetsZ, time) - sampleCurve(offsetsZ, prediction.consumed);
      const gap = Math.hypot(offsetX, offsetZ);

      if ((position >= lastIndex && gap < settledOffsetMeters) || gap > maximumOffsetMeters) {
        impactsBySeat.delete(source.seat);
        continue;
      }
      const hop = sampleCurve(hops, time) - sampleCurve(hops, prediction.consumed);

      displayed.x = source.x + offsetX;
      displayed.z = source.z + offsetZ;
      // 수신 위치의 뜀을 빼다가 바닥 밑으로 내려가지 않게 함.
      displayed.y = Math.max(source.y + hop, Math.min(source.y, prediction.originY));
    }
    lastUpdatedAt = now;
  };

  return { enqueue, update, clear };
};
