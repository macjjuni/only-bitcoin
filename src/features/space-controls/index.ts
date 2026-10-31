export {
  applyCameraDrag,
  applyKeyboardYaw,
  type CameraOrbit,
  clampCameraPitch,
  createDefaultCameraOrbit,
  dampVector,
  resolveCameraFocus,
  resolveCameraPosition,
  resolveDampFactor,
  resolveFollowDamping,
  SPACE_CAMERA,
  SPACE_CAMERA_FOCUS_HEIGHT,
  type Vector3Like,
} from "./model/followCamera";
export {
  createEmptyMovementInput,
  type MovementInput,
  planFixedSteps,
  SPACE_MOVEMENT,
  stepMovement,
} from "./model/movement";
export {
  consumePendingDrag,
  createSpaceInputSource,
  resolveMergedMovementInput,
  type SpaceInputSource,
} from "./model/spaceInputSource";
export { default as useKeyboardInput } from "./model/useKeyboardInput";
export { default as usePointerDrag } from "./model/usePointerDrag";
export { default as usePrefersReducedMotion } from "./model/usePrefersReducedMotion";
export { default as VirtualJoystick } from "./ui/VirtualJoystick";
