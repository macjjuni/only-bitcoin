import {
  type BossSimulationPlayer,
  createBossSimulation,
  type SpaceBossState,
} from "@/entities/space";

/**
 * 개발 전용 보스 미리보기.
 *
 * 서버 없이 내 화면에서만 보스를 돌려 모션 연결을 확인함. 두뇌는 서버와 같은
 * `createBossSimulation` 이고, 여기서는 나 한 명을 상대로 세우고 죽으면 다시 불러낼 뿐임.
 * 유저는 맞지 않음(체력이 서버에 있음).
 */

export interface BossPreviewPlayer {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface BossPreview {
  /** 매 프레임 제자리에서 고침. 렌더 쪽은 이 객체를 그대로 읽음. */
  state: SpaceBossState;
  step: (nowMs: number, deltaSeconds: number, player: BossPreviewPlayer) => void;
  /** 내가 공격을 휘둘렀을 때. 닿는 거리면 보스가 맞음. */
  registerKick: (nowMs: number, player: BossPreviewPlayer) => void;
}

/** 혼자 금방 한 바퀴를 볼 수 있게 체력을 작게 잡았음. 20대면 쓰러짐. */
const PREVIEW_MAXIMUM_HEALTH = 200;
/** 처치 뒤 다시 나올 때까지(ms). */
const PREVIEW_RESPAWN_DELAY_MS = 4_000;
const PREVIEW_SEAT = 0;

export const createBossPreview = (): BossPreview => {
  const simulation = createBossSimulation(PREVIEW_MAXIMUM_HEALTH);
  let respawnAt = 0;

  const toSimulationPlayer = (nowMs: number, player: BossPreviewPlayer): BossSimulationPlayer => ({
    seat: PREVIEW_SEAT,
    x: player.x,
    y: player.y,
    z: player.z,
    yaw: player.yaw,
    // 미리보기에서는 자리 비움을 안 따짐.
    lastInputAt: nowMs,
    isAlive: true,
  });

  /** 걸음마다 상태가 제자리에서 바뀌어 매번 다시 읽음. */
  const isHidden = (): boolean => simulation.state.phase === "hidden";

  const step = (nowMs: number, deltaSeconds: number, player: BossPreviewPlayer): void => {
    if (isHidden()) {
      if (nowMs >= respawnAt) {
        simulation.spawn(nowMs);
      }
      return;
    }

    simulation.step(nowMs, deltaSeconds, [toSimulationPlayer(nowMs, player)]);

    if (isHidden()) {
      respawnAt = nowMs + PREVIEW_RESPAWN_DELAY_MS;
    }
  };

  const registerKick = (nowMs: number, player: BossPreviewPlayer): void => {
    simulation.applyKick(nowMs, toSimulationPlayer(nowMs, player));
  };

  return { state: simulation.state, step, registerKick };
};
