export { loadAvatarModelIndex, saveAvatarModelIndex } from "./model/avatarModelStore";
export {
  applyCameraDrag,
  applyCameraZoom,
  applyKeyboardYaw,
  approachCollisionDistance,
  type CameraOrbit,
  clampCameraDistance,
  clampCameraPitch,
  clampCameraPosition,
  createDefaultCameraOrbit,
  dampVector,
  resolveCameraFocus,
  resolveCameraLookTarget,
  resolveCameraPosition,
  resolveDampFactor,
  resolveFollowDamping,
  SPACE_CAMERA,
  SPACE_CAMERA_FOCUS_HEIGHT,
  type Vector3Like,
} from "./model/followCamera";
export { shouldIgnoreSpaceHotkey } from "./model/keyboardInputEvents";
export {
  applyKnockback,
  createEmptyMovementInput,
  type MovementInput,
  planFixedSteps,
  SPACE_MOVEMENT,
  stepMovement,
} from "./model/movement";
export {
  createPointerGestureState,
  hasActivePointers,
  movePointer,
  type PointerDragDelta,
  type PointerGestureState,
  pressPointer,
  readPinchSpread,
  releasePointer,
} from "./model/pointerGesture";
export {
  consumePendingDrag,
  consumePendingZoom,
  createSpaceInputSource,
  resolveMergedMovementInput,
  type SpaceInputSource,
} from "./model/spaceInputSource";
export { default as useCoarsePointer } from "./model/useCoarsePointer";
export { default as useKeyboardInput } from "./model/useKeyboardInput";
export { default as usePointerDrag } from "./model/usePointerDrag";
export { default as usePrefersReducedMotion } from "./model/usePrefersReducedMotion";
export { default as JumpButton } from "./ui/JumpButton";
export { default as KickButton } from "./ui/KickButton";
export { default as VirtualJoystick } from "./ui/VirtualJoystick";
