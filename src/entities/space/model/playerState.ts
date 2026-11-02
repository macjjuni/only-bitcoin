/**
 * 플레이어 상태 타입.
 *
 * 바닥은 평평하므로 `y` 는 점프로만 바뀐다. 서 있을 때는 항상 0 이다.
 */

export interface PlayerTransform {
  x: number;
  z: number;
  /** 발바닥 높이(m). 바닥은 0 이고 점프 중에만 양수다. */
  y: number;
  /** Y축 회전(라디안). */
  yaw: number;
}

export interface LocalPlayerState extends PlayerTransform {
  velocityX: number;
  velocityZ: number;
  velocityY: number;
  isRunning: boolean;
  /**
   * 발이 지면에 붙어 있는지.
   *
   * **`y` 로는 알 수 없다.** 벙커는 바닥이 0 이라 `y <= 0` 이 곧 접지였지만,
   * 섬은 광장이 5·테라스가 7.5·궁전이 11 이라 서 있어도 `y` 가 0 이 아니다.
   * 지면 높이는 지형에 물어봐야 알 수 있으므로 적분기가 계산한 결과를 그대로
   * 실어 보낸다 — 걷기 모션이 이 값으로 다리를 멈춘다.
   */
  isGrounded: boolean;
}

export interface RemotePlayer extends PlayerTransform {
  /** 서버가 배정한 좌석. `InstancedMesh` 슬롯 인덱스와 같다. */
  seat: number;
  nickname: string;
  colorIndex: number;
  /**
   * 고른 아바타 모델 번호.
   *
   * 모델마다 지오메트리가 달라 `InstancedMesh` 를 따로 써야 하므로, 렌더 쪽에서
   * 이 값으로 사람을 묶는다.
   */
  modelIndex: number;
}

export const createLocalPlayerState = (spawn: PlayerTransform): LocalPlayerState => ({
  ...spawn,
  velocityX: 0,
  velocityZ: 0,
  velocityY: 0,
  isRunning: false,
  isGrounded: true,
});

/**
 * 공간 접속 상태.
 *
 * `SpaceRoom` 입장 완료 전에는 접속자 수를 노출하지 않는다. 서버 미설정·
 * 연결 실패·개발 더미 모드는 `offline`, 연결·재접속 중에는 `connecting`이다.
 */
export type SpacePresenceStatus = "offline" | "connecting" | "online";

export interface SpacePresence {
  status: SpacePresenceStatus;
  /** 자신을 포함한 접속자 수. `online` 일 때만 의미가 있다. */
  occupantCount: number;
}

export const createOfflinePresence = (occupantCount = 0): SpacePresence => ({
  status: "offline",
  occupantCount,
});
