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
  parseSpaceClientFrame,
  parseSpaceServerFrame,
  SPACE_CHAT_COOLDOWN_MS,
  SPACE_CHAT_MAX_GRAPHEMES,
  SPACE_NETWORK_INTERVAL_MS,
  SPACE_NICKNAME_COOLDOWN_MS,
  SPACE_PROTOCOL_VERSION,
  SPACE_SERVER_FRAME_MAX_BYTES,
  type SpaceChatMessage,
  type SpaceClientFrame,
  type SpaceMotion,
  type SpaceMotionSnapshot,
  type SpacePeer,
  type SpaceServerFrame,
} from "./model/spaceProtocol";
export {
  createFlatTerrain,
  SPACE_AVATAR_COLLISION_HEIGHT,
  SPACE_AVATAR_COLLISION_RADIUS,
  SPACE_STEP_HEIGHT,
  type SpaceTerrain,
  type TerrainMoveResult,
} from "./model/spaceTerrain";
export {
  SPACE_BILLBOARD,
  SPACE_BLOCK_DASHBOARD,
  SPACE_BOUNDS,
  SPACE_CAMERA_BOUNDS,
  SPACE_HALL,
  SPACE_MAX_ALTITUDE,
  SPACE_MAX_OCCUPANTS,
  SPACE_MENU_FRAME,
  SPACE_OVERLAY_LIMITS,
  SPACE_SCREEN_FRAME,
  SPACE_SCREEN_GLOW_POSITIONS,
  SPACE_SCREEN_HALF,
  SPACE_SCREEN_PLACEMENTS,
  SPACE_SCREEN_SCALE,
  SPACE_SPAWN_FACING,
  SPACE_SPAWN_RING,
  SPACE_TEXT_BANNER,
} from "./model/spaceWorld";
