import { SPACE_CAMERA } from "./followCamera";
import {
  createPointerGestureState,
  movePointer,
  pressPointer,
  readPinchSpread,
  releasePointer,
} from "./pointerGesture";
import { consumePendingZoom, type SpaceInputSource } from "./spaceInputSource";

/**
 * 캔버스 이벤트를 프레임 루프가 소비하는 입력으로 연결한다.
 *
 * 핀치 거리는 최신 좌표만 기록하고 실제 줌량은 consumePendingZoom에서 계산한다.
 * 손가락 구성이 바뀔 때는 기준 거리도 바꿔 이전 핀치와 새 핀치를 비교하지 않는다.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
export const attachPointerGestureEvents = (
  inputSource: SpaceInputSource,
  targetElement: HTMLElement,
  blurTarget: EventTarget,
): (() => void) => {
  const gestureState = createPointerGestureState();
  const activeTouchPointerIds = new Set<number>();

  // region [Privates]
  const resetPinchBaseline = (): void => {
    const pinchSpread = readPinchSpread(gestureState);
    inputSource.pinchSpread = pinchSpread;
    inputSource.consumedPinchSpread = pinchSpread;
  };

  const clearPendingCameraRotation = (): void => {
    inputSource.pendingDragX = 0;
    inputSource.pendingDragY = 0;
  };

  const clearPendingCameraInput = (): void => {
    clearPendingCameraRotation();
    inputSource.pendingZoomDistance = 0;
  };

  const releaseCapturedPointer = (pointerId: number): void => {
    if (targetElement.hasPointerCapture(pointerId)) {
      targetElement.releasePointerCapture(pointerId);
    }
  };

  const clearGesture = (): void => {
    const capturedPointerIds = Array.from(gestureState.pointers.keys());
    gestureState.pointers.clear();
    activeTouchPointerIds.clear();
    resetPinchBaseline();
    clearPendingCameraInput();

    for (const pointerId of capturedPointerIds) {
      releaseCapturedPointer(pointerId);
    }
  };
  // endregion


  // region [Events]
  const onPointerDownCanvas = (pointerEvent: PointerEvent): void => {
    const isPointerTracked = pressPointer(
      gestureState,
      pointerEvent.pointerId,
      pointerEvent.clientX,
      pointerEvent.clientY,
    );

    if (!isPointerTracked) {
      return;
    }

    if (pointerEvent.pointerType === "touch") {
      activeTouchPointerIds.add(pointerEvent.pointerId);
    }

    targetElement.setPointerCapture(pointerEvent.pointerId);
    resetPinchBaseline();

    if (inputSource.pinchSpread !== null) {
      // 같은 프레임에 먼저 들어온 한 손가락 드래그도 핀치와 섞지 않는다.
      clearPendingCameraRotation();
    }
  };

  const onPointerMoveCanvas = (pointerEvent: PointerEvent): void => {
    const { dragX, dragY } = movePointer(
      gestureState,
      pointerEvent.pointerId,
      pointerEvent.clientX,
      pointerEvent.clientY,
    );

    inputSource.pendingDragX += dragX;
    inputSource.pendingDragY += dragY;
    inputSource.pinchSpread = readPinchSpread(gestureState);
  };

  const onPointerReleaseCanvas = (pointerEvent: PointerEvent): void => {
    if (!releasePointer(gestureState, pointerEvent.pointerId)) {
      return;
    }

    if (pointerEvent.type === "pointerup") {
      // 다음 프레임 전에 끝난 정상 핀치도 마지막 이동량을 잃지 않게 보관한다.
      inputSource.pendingZoomDistance = consumePendingZoom(inputSource);
    } else {
      clearPendingCameraInput();
    }

    activeTouchPointerIds.delete(pointerEvent.pointerId);
    resetPinchBaseline();
    releaseCapturedPointer(pointerEvent.pointerId);
  };

  const onWheelCanvas = (wheelEvent: WheelEvent): void => {
    wheelEvent.preventDefault();

    if (activeTouchPointerIds.size > 0) {
      return;
    }

    inputSource.pendingZoomDistance += wheelEvent.deltaY * SPACE_CAMERA.wheelZoomSensitivity;
  };

  const onBlurWindow = (): void => {
    clearGesture();
  };
  // endregion


  // region [Life Cycles]
  targetElement.addEventListener("pointerdown", onPointerDownCanvas);
  targetElement.addEventListener("pointermove", onPointerMoveCanvas);
  targetElement.addEventListener("pointerup", onPointerReleaseCanvas);
  targetElement.addEventListener("pointercancel", onPointerReleaseCanvas);
  targetElement.addEventListener("lostpointercapture", onPointerReleaseCanvas);
  targetElement.addEventListener("wheel", onWheelCanvas, { passive: false });
  blurTarget.addEventListener("blur", onBlurWindow);

  return () => {
    targetElement.removeEventListener("pointerdown", onPointerDownCanvas);
    targetElement.removeEventListener("pointermove", onPointerMoveCanvas);
    targetElement.removeEventListener("pointerup", onPointerReleaseCanvas);
    targetElement.removeEventListener("pointercancel", onPointerReleaseCanvas);
    targetElement.removeEventListener("lostpointercapture", onPointerReleaseCanvas);
    targetElement.removeEventListener("wheel", onWheelCanvas);
    blurTarget.removeEventListener("blur", onBlurWindow);
    clearGesture();
  };
  // endregion
};
