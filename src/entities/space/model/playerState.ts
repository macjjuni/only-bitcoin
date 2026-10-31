/** 플레이어 상태 타입. 위치는 2D(x, z) 로만 다룬다. 월드에 높이 변화가 없다. */

export interface PlayerTransform {
  x: number;
  z: number;
  /** Y축 회전(라디안). */
  yaw: number;
}

export interface LocalPlayerState extends PlayerTransform {
  velocityX: number;
  velocityZ: number;
  isRunning: boolean;
}

export interface RemotePlayer extends PlayerTransform {
  /** 서버가 배정한 좌석. `InstancedMesh` 슬롯 인덱스와 같다. */
  seat: number;
  nickname: string;
  colorIndex: number;
}

export const createLocalPlayerState = (spawn: PlayerTransform): LocalPlayerState => ({
  ...spawn,
  velocityX: 0,
  velocityZ: 0,
  isRunning: false,
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
