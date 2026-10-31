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
 * 1단계에는 네트워크가 없어 항상 `offline` 이다. 2단계에서 `SpaceRoom` 연결
 * 상태를 그대로 올린다. 숫자만 띄우면 네트워크가 없는데도 접속자가 있는 것처럼
 * 읽히므로 상태를 함께 들고 다닌다.
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
