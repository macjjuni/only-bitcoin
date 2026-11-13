export {
  canKickReachBoss,
  isInsideBossArena,
  isInsideBossAttack,
  isInsideBossChargeSweep,
} from "./lib/bossHitTest";
export {
  isBossPresent,
  resolveBossSlotStart,
  resolveBossSpawnedAt,
  resolveNextBossSpawnAt,
} from "./lib/bossSchedule";
export {
  type BossDeath,
  type BossSimulation,
  type BossSimulationPlayer,
  createBossSimulation,
} from "./lib/bossSimulation";
export { resolveColorIndexFromClientKey } from "./lib/clientKeyHash";
export {
  appendPriceSample,
  createSurgeState,
  type PriceSample,
  readCalmChangePercent,
  readCandleChangePercent,
  resolveReferencePrice,
  SPACE_BGM_SURGE,
  type SurgeState,
  stepSurgeState,
} from "./lib/marketSurge";
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
  type SpaceWeaponId,
} from "./model/avatarModel";
export {
  createHiddenBossState,
  resolveBossAttackSeconds,
  resolveBossChargeTravel,
  SPACE_BOSS,
  SPACE_BOSS_ATTACKS,
  SPACE_BOSS_CLIP_SECONDS,
  SPACE_BOSS_COMBAT,
  SPACE_BOSS_DEATH,
  SPACE_BOSS_HIT,
  SPACE_BOSS_PLAYER,
  SPACE_BOSS_SPAWN,
  SPACE_BOSS_SPAWN_INTERVAL_MS,
  SPACE_BOSS_STRIDE,
  SPACE_BOSS_TURN,
  SPACE_FEATURE_BOSS,
  type SpaceBossAttack,
  type SpaceBossPhase,
  type SpaceBossState,
} from "./model/boss";
export { SPACE_FEATURE_KICK, SPACE_FEATURE_KICK_TIMING, SPACE_KICK } from "./model/kick";
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
  isSpaceCelebration,
  isSpaceMarketState,
  SPACE_FEATURE_MARKET,
  SPACE_MARKET,
  type SpaceCelebration,
  type SpaceMarketState,
} from "./model/spaceMarket";
export {
  parseSpaceClientFrame,
  parseSpaceServerFrame,
  SPACE_CHAT_COOLDOWN_MS,
  SPACE_CHAT_MAX_GRAPHEMES,
  SPACE_NETWORK_INTERVAL_MS,
  SPACE_NICKNAME_COOLDOWN_MS,
  SPACE_PROTOCOL_VERSION,
  SPACE_SERVER_FRAME_MAX_BYTES,
  type SpaceBossWelcome,
  type SpaceBossWire,
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
  SPACE_HEATMAP_FRAME,
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
  SPACE_TICKER_FRAME,
} from "./model/spaceWorld";
