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
  isAvatarModelIndex,
  resolveAvatarModel,
  SPACE_AVATAR_MODELS,
  SPACE_DEFAULT_AVATAR_MODEL_INDEX,
  type SpaceAvatarModel,
} from "./model/avatarModel";
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
  resolveGroundHeight,
  resolveObstacleCollision,
  SPACE_AVATAR_COLLISION_RADIUS,
  SPACE_OBSTACLES,
  type SpaceObstacle,
} from "./model/spaceObstacles";
export {
  parseSpaceClientFrame,
  parseSpaceServerFrame,
  SPACE_CHAT_COOLDOWN_MS,
  SPACE_CHAT_MAX_GRAPHEMES,
  SPACE_NETWORK_INTERVAL_MS,
  SPACE_NICKNAME_COOLDOWN_MS,
  SPACE_PROTOCOL_VERSION,
  type SpaceChatMessage,
  type SpaceClientFrame,
  type SpaceMotion,
  type SpaceMotionSnapshot,
  type SpacePeer,
  type SpaceServerFrame,
} from "./model/spaceProtocol";
export {
  SPACE_BILLBOARD,
  SPACE_BLOCK_DASHBOARD,
  SPACE_BOUNDS,
  SPACE_CAMERA_BOUNDS,
  SPACE_GROUND,
  SPACE_LOUNGE,
  SPACE_MAX_JUMP_HEIGHT,
  SPACE_MAX_OCCUPANTS,
  SPACE_OVERLAY_LIMITS,
  SPACE_ROOM_HEIGHT,
  SPACE_SPAWN_RING,
  SPACE_TEXT_BANNER,
  SPACE_WALL_ANCHOR,
  SPACE_WALL_PANEL_SPAN,
  SPACE_WALL_Z,
} from "./model/spaceWorld";
