import type { HashStreamPreset, LogoEffectFactory } from "@/shared/lib/wordmark-canvas";
import {
  createGlitchLogoController,
  createHashStreamController,
  type GlitchPlaybackMode,
  type GlitchPreset,
} from "@/shared/lib/wordmark-canvas";

/**
 * 기존 글리치·해시 스트림 컨트롤러를 공용 `LogoEffectFactory` 로 감싼 어댑터.
 * 아이콘 텍스처가 `BakedWordmark` 모양이라 컨트롤러는 손대지 않고 그대로 씀.
 */

// region [Types]
export interface GlitchEffectPreset {
  glitchPreset: GlitchPreset;
  playbackMode: GlitchPlaybackMode;
}
// endregion

// region [Factory]
export const glitchEffect: LogoEffectFactory<GlitchEffectPreset> = ({
  canvas,
  bakedSource,
  preset,
}) => {
  const controller = createGlitchLogoController({
    canvas,
    bakedWordmark: bakedSource,
    preset: preset.glitchPreset,
    playbackMode: preset.playbackMode,
  });

  return {
    start: () => controller.start(),
    stop: () => controller.stop(),
    trigger: () => controller.triggerBurstNow(),
    destroy: () => controller.destroy(),
  };
};

/** 스트림 문자는 문서 폰트로 `fillText` 함. 폰트 로드 전에 그리면 첫 스트립이 폴백 폰트로 남음. */
export const hashStreamEffect: LogoEffectFactory<HashStreamPreset> = async ({
  canvas,
  bakedSource,
  preset,
}) => {
  await document.fonts.load("700 16px 'JetBrains Mono'");

  const controller = createHashStreamController({ canvas, bakedWordmark: bakedSource, preset });

  return {
    start: () => controller.start(),
    stop: () => controller.stop(),
    trigger: () => {},
    destroy: () => controller.destroy(),
  };
};
// endregion
