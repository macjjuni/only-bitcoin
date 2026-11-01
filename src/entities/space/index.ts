export { resolveColorIndexFromClientKey } from "./lib/clientKeyHash";
export { createSpaceInterpolator, type SpaceInterpolator } from "./lib/remoteInterpolation";
export { decodeSpaceSnapshot, encodeSpaceSnapshot } from "./lib/spaceSnapshot";
export { createSpawnPoint } from "./lib/spawnPoint";
export {
  resolveAvatarColor,
  SPACE_AVATAR,
  SPACE_AVATAR_COLORS,
  type SpaceAvatarColor,
} from "./model/avatar";
export {
  createLocalPlayerState,
  createOfflinePresence,
  type LocalPlayerState,
  type PlayerTransform,
  type RemotePlayer,
  type SpacePresence,
  type SpacePresenceStatus,
} from "./model/playerState";
export {
  parseSpaceClientFrame,
  parseSpaceServerFrame,
  SPACE_CHAT_COOLDOWN_MS,
  SPACE_NETWORK_INTERVAL_MS,
  SPACE_PROTOCOL_VERSION,
  type SpaceChatMessage,
  type SpaceClientFrame,
  type SpaceMotion,
  type SpaceMotionSnapshot,
  type SpacePeer,
  type SpaceServerFrame,
} from "./model/spaceProtocol";
export {
  SPACE_AD_BOARDS,
  SPACE_BILLBOARD,
  SPACE_BOUNDS,
  SPACE_GROUND,
  SPACE_MAX_JUMP_HEIGHT,
  SPACE_MAX_OCCUPANTS,
  SPACE_OVERLAY_LIMITS,
  SPACE_SPAWN_RING,
  SPACE_TEXT_BANNER,
  SPACE_WALL_ANCHOR,
  SPACE_WALL_Z,
  type SpaceAdBoardId,
  type SpaceAdBoardPlacement,
} from "./model/spaceWorld";
