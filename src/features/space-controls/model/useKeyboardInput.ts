"use client";

import { useEffect } from "react";
import { attachSpaceKeyboardEvents } from "./keyboardInputEvents";
import type { SpaceInputSource } from "./spaceInputSource";

const useKeyboardInput = (inputSource: SpaceInputSource): void => {
  // region [Life Cycles]
  useEffect(() => attachSpaceKeyboardEvents(inputSource, window, document), [inputSource]);
  // endregion
};

export default useKeyboardInput;
