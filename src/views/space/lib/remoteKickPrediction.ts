import {
  createLocalPlayerState,
  type LocalPlayerState,
  type RemotePlayer,
  type SpaceTerrain,
} from "@/entities/space";
import {
  applyKnockback,
  createEmptyMovementInput,
  SPACE_MOVEMENT,
  stepMovement,
} from "@/features/space-controls";

const predictionHoldMs = 400;
const reconciliationMs = 250;
const maximumPredictionGapMeters = 3;
/** 한 프레임에 이보다 적게 움직였으면 서 있던 것으로 봄. */
const stationaryStepMeters = 0.01;
/** 서 있던 상대가 타격 전에 밀리는 쪽으로 이만큼 갔으면 실제 넉백이 먼저 온 것임. */
const arrivedKnockbackMeters = 0.1;
/** 타격을 기다리는 동안 옆·반대쪽으로 이만큼 갔으면 스스로 움직인 것으로 봄. */
const ownMovementMeters = 0.15;
const idleInput = createEmptyMovementInput();

interface PendingImpact {
  player: RemotePlayer;
  impactAt: number;
  dirX: number;
  dirZ: number;
  /** 공격 시작부터 내가 알게 되기까지 걸린 시간. 느린 연결은 위치가 따라올 여유도 늘림. */
  confirmationDelayMs?: number;
  /** 큐에 넣은 프레임의 위치. 첫 update 가 채움. */
  queuedX?: number;
  queuedZ?: number;
  wasStationary?: boolean;
}

interface PredictedImpact {
  player: RemotePlayer;
  state: LocalPlayerState;
  startedAt: number;
  updatedAt: number;
  reconcileAt: number;
}

/**
 * 서버가 확인한 명중을 맞은 사람의 위치 패킷보다 먼저 보여줌. 찬 사람이 누구든 같음.
 *
 * 보간기의 원본 좌표에는 손대지 않는다. 예측한 절대 위치에서 수신 위치로 섞어
 * 돌아가므로 이미 넉백이 들어 있는 스냅샷에 충격량을 다시 더하지 않는다.
 * 예측은 400ms + 확인 지연(최대 500ms) 뒤부터 250ms 동안 해제한다.
 * 벽·바닥 판정은 실제 이동과 공유한다.
 * 숨은 탭은 맞자마자 최종 위치를 한 번에 보내서 타격 시각보다 먼저 도착할 수 있다.
 * 서 있던 상대는 타격 시각까지 맞기 전 자리에 세워 두고, 그 자리에서 예측을 시작한다.
 * 먼저 온 위치를 그대로 보여주면 뚝 끊겨 밀리고, 그 위에 예측을 더하면 두 번 밀린다.
 * 평상시에는 좌표 복사만 하고, 지형 연산은 현재 맞은 아바타에만 수행한다.
 */
export const createRemoteKickPrediction = () => {
  const pendingImpacts: PendingImpact[] = [];
  const impactsBySeat = new Map<number, PredictedImpact>();
  /** 타격을 기다리는 동안 맞기 전 자리에 세워 둘 좌석. 매 update 다시 채움. */
  const heldPositionsBySeat = new Map<number, PendingImpact>();

  const clear = (): void => {
    pendingImpacts.length = 0;
    impactsBySeat.clear();
    heldPositionsBySeat.clear();
  };

  const enqueue = (impact: PendingImpact): void => {
    // 서버 큐와 같은 크기로 제한. 탭 정지·퇴장 때 남은 연출은 update에서 폐기함.
    if (pendingImpacts.length < 32) {
      pendingImpacts.push(impact);
    }
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
      if (impact.queuedX === undefined || impact.queuedZ === undefined) {
        // 표시 좌표에는 아직 지난 프레임 값이 남아 있어 그 차이로 움직임을 봄.
        const lastFrame = displayedPlayers.find((player) => player.seat === impact.player.seat);
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
      if (!players.includes(impact.player) || now - impact.impactAt > predictionHoldMs) {
        continue;
      }
      const hasArrivedEarly = impact.wasStationary && movedAlong > arrivedKnockbackMeters;
      const previous = impactsBySeat.get(impact.player.seat);
      const displayed = displayedPlayers.find((player) => player.seat === impact.player.seat);
      const transform = previous && displayed ? displayed : impact.player;
      const state = previous
        ? { ...previous.state, x: transform.x, y: transform.y, z: transform.z }
        : createLocalPlayerState(transform);
      if (hasArrivedEarly) {
        // 먼저 온 실제 넉백 위에 더하지 않고 맞기 전 자리에서 같은 동작으로 밀어 줌.
        state.x = impact.queuedX;
        state.z = impact.queuedZ;
      }
      state.isGrounded =
        Math.abs(state.y - terrain.resolveGroundY(state.x, state.z, state.y)) < 0.2;
      impactsBySeat.set(impact.player.seat, {
        player: impact.player,
        state: applyKnockback(state, impact.dirX, impact.dirZ),
        startedAt: now,
        updatedAt: now,
        reconcileAt:
          now + predictionHoldMs + Math.min(500, Math.max(0, impact.confirmationDelayMs ?? 0)),
      });
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
      const elapsed = now - prediction.startedAt;
      const gap = Math.hypot(
        prediction.state.x - source.x,
        prediction.state.y - source.y,
        prediction.state.z - source.z,
      );
      // 실제 위치가 따라왔으면 여유 시간을 다 기다리지 않음. 이동 중인 상대를 붙잡지 않음.
      if (elapsed >= 150 && gap < 0.15) {
        prediction.reconcileAt = Math.min(prediction.reconcileAt, now);
      }
      if (now >= prediction.reconcileAt + reconciliationMs || gap > maximumPredictionGapMeters) {
        impactsBySeat.delete(source.seat);
        continue;
      }

      // 프레임 정지 후 수백 번 적분하지 않음. 실제 이동과 같은 고정 스텝을 사용함.
      const stepCount = Math.min(
        SPACE_MOVEMENT.maxCatchUpSteps,
        Math.floor((now - prediction.updatedAt) / (SPACE_MOVEMENT.fixedTimeStep * 1000)),
      );
      for (let step = 0; step < stepCount; step += 1) {
        prediction.state = stepMovement(
          prediction.state,
          idleInput,
          0,
          SPACE_MOVEMENT.fixedTimeStep,
          terrain,
        );
      }
      prediction.updatedAt += stepCount * SPACE_MOVEMENT.fixedTimeStep * 1000;
      if (now - prediction.updatedAt > 100) {
        prediction.updatedAt = now;
      }

      const progress = Math.min(1, Math.max(0, (now - prediction.reconcileAt) / reconciliationMs));
      const blend = progress * progress * (3 - 2 * progress);
      const predicted = prediction.state;
      displayed.x = predicted.x + (source.x - predicted.x) * blend;
      displayed.y = predicted.y + (source.y - predicted.y) * blend;
      displayed.z = predicted.z + (source.z - predicted.z) * blend;
    }
  };

  return { enqueue, update, clear };
};
