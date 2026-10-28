"use client";

import { type MouseEvent, useMemo, useState } from "react";
import { BITCOIN_COLOR } from "@/shared/config/color";
import {
  formatGlitchPresetSpec,
  GLITCH_PRESETS,
  type GlitchPlaybackMode,
} from "@/shared/lib/wordmark-canvas";
import { GlitchWordmark } from "@/shared/ui";
import { type GlitchEffectPreset, glitchEffect } from "../lib/legacyEffectAdapters";
import { resolveToggleButtonClass, TAB_INTRO_CLASS } from "../model/sampleLayout";
import LogoEffectCanvas from "./LogoEffectCanvas";
import StyleSampleCard from "./StyleSampleCard";

// region [Types]
interface PlaybackModeOption {
  mode: GlitchPlaybackMode;
  label: string;
  hint: string;
}
// endregion

// region [Constants]
const PLAYBACK_MODE_OPTIONS: PlaybackModeOption[] = [
  {
    mode: "frozen",
    label: "글리치 고정",
    hint: "글리치 한 프레임을 멈춰 세움. 채널 분리 폭·띠 개수·스캔라인 비교용. 로고를 누르면 프레임을 다시 뽑음.",
  },
  {
    mode: "continuous",
    label: "연속 재생",
    hint: "쉬지 않고 글리치를 갈아 끼움. 움직임 성격·거슬림 정도 확인용. 실제 동작보다 훨씬 과격함.",
  },
  {
    mode: "production",
    label: "실제 동작",
    hint: "서비스에 나갈 동작. 대기 중엔 멈춰 있다가 몇 초마다 짧게 튐. 로고를 누르면 대기를 건너뜀.",
  },
];
// endregion

export default function GlitchStyleTab() {
  // region [Hooks]
  const [playbackMode, setPlaybackMode] = useState<GlitchPlaybackMode>("continuous");

  /** 아이콘 어댑터용 프리셋. 모드가 바뀔 때만 새로 만들어야 아이콘을 다시 안 구움. */
  const glitchEffectPresets = useMemo<GlitchEffectPreset[]>(
    () => GLITCH_PRESETS.map((glitchPreset) => ({ glitchPreset, playbackMode })),
    [playbackMode],
  );
  // endregion

  // region [Events]
  /** 리스트 항목마다 익명 함수 안 만들려고 `data-mode` 로 읽음. */
  const onClickPlaybackModeButton = (event: MouseEvent<HTMLButtonElement>) => {
    const selectedMode = event.currentTarget.dataset.mode as GlitchPlaybackMode | undefined;

    if (selectedMode === undefined) {
      return;
    }
    setPlaybackMode(selectedMode);
  };
  // endregion

  // region [Templates]
  const selectedModeOption =
    PLAYBACK_MODE_OPTIONS.find((option) => option.mode === playbackMode) ??
    PLAYBACK_MODE_OPTIONS[0];
  // endregion

  return (
    <div className="flex flex-col gap-6">
      <p className={TAB_INTRO_CLASS}>
        HTML/CSS 로 조판한 워드마크를 캔버스에 구워 채널 분리·가로 띠 변위로 글리치를 입힘. 아이콘도
        같은 엔진에 그대로 태웠음.
      </p>

      <div className="flex flex-col gap-2 px-1">
        <div className="flex flex-wrap gap-1.5">
          {PLAYBACK_MODE_OPTIONS.map((option) => (
            <button
              key={option.mode}
              type="button"
              aria-pressed={option.mode === playbackMode}
              data-mode={option.mode}
              onClick={onClickPlaybackModeButton}
              className={resolveToggleButtonClass(option.mode === playbackMode)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {selectedModeOption.hint}
        </p>
      </div>

      {GLITCH_PRESETS.map((glitchPreset, presetIndex) => (
        <StyleSampleCard
          key={glitchPreset.id}
          name={glitchPreset.name}
          spec={formatGlitchPresetSpec(glitchPreset)}
          description={glitchPreset.description}
          renderIcon={(iconSizeInCssPx) => (
            <LogoEffectCanvas
              effect={glitchEffect}
              preset={glitchEffectPresets[presetIndex]}
              sourceKind="icon"
              fillColor={BITCOIN_COLOR}
              widthInCssPx={iconSizeInCssPx}
              heightInCssPx={iconSizeInCssPx}
            />
          )}
          renderWordmark={(sampleSize) => (
            <GlitchWordmark
              preset={glitchPreset}
              playbackMode={playbackMode}
              widthInCssPx={sampleSize.widthInCssPx}
              heightInCssPx={sampleSize.heightInCssPx}
            />
          )}
        />
      ))}
    </div>
  );
}
