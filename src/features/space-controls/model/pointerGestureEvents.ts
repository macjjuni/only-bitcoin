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
 * 마우스를 누른 뒤 이만큼(px) 넘게 움직이면 클릭이 아니라 시야 드래그로 봄.
 *
 * 손이 살짝 떨리는 정도는 클릭으로 받아야 해서 0 으로 두지 않음.
 */
export const CLICK_ATTACK_MAXIMUM_TRAVEL_PX = 5;

/** 누르고 있는 마우스 왼쪽 버튼. 뗄 때 클릭이었는지 가리는 데 씀. */
interface MousePress {
  pointerId: number;
  clientX: number;
  clientY: number;
  /** 누른 뒤 움직인 길이(px). 갔다가 제자리로 돌아와도 드래그로 봄. */
  travel: number;
}

/**
 * 캔버스 이벤트를 프레임 루프가 소비하는 입력으로 연결한다.
 *
 * 마우스는 **끌지 않고 뗀 왼쪽 클릭**을 공격으로 받는다. 누르는 순간에 받으면 시야를
 * 돌리려고 누를 때마다 헛스윙이 나간다. 터치는 공격 버튼이 따로 있어 해당 없다.
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
  let mousePress: MousePress | null = null;

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
    mousePress = null;
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
    if (pointerEvent.pointerType === "mouse" && pointerEvent.button === 0) {
      mousePress = {
        pointerId: pointerEvent.pointerId,
        clientX: pointerEvent.clientX,
        clientY: pointerEvent.clientY,
        travel: 0,
      };
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

    if (mousePress?.pointerId === pointerEvent.pointerId) {
      mousePress.travel += Math.hypot(
        pointerEvent.clientX - mousePress.clientX,
        pointerEvent.clientY - mousePress.clientY,
      );
      mousePress.clientX = pointerEvent.clientX;
      mousePress.clientY = pointerEvent.clientY;
    }

    inputSource.pendingDragX += dragX;
    inputSource.pendingDragY += dragY;
    inputSource.pinchSpread = readPinchSpread(gestureState);
  };

  const onPointerReleaseCanvas = (pointerEvent: PointerEvent): void => {
    if (!releasePointer(gestureState, pointerEvent.pointerId)) {
      return;
    }

    const releasedPress = mousePress?.pointerId === pointerEvent.pointerId ? mousePress : null;

    if (releasedPress) {
      mousePress = null;
    }
    // 끌지 않고 뗀 클릭만 공격임. 취소·캡처 상실로 끝난 것은 클릭이 아님.
    if (
      releasedPress &&
      pointerEvent.type === "pointerup" &&
      releasedPress.travel <= CLICK_ATTACK_MAXIMUM_TRAVEL_PX
    ) {
      inputSource.isKickRequested = true;
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
