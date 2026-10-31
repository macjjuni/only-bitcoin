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
