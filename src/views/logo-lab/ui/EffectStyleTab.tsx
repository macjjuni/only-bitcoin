"use client";

import type { LogoEffectFactory, LogoEffectPresetBase } from "@/shared/lib/wordmark-canvas";
import { TAB_INTRO_CLASS } from "../model/sampleLayout";
import LogoEffectCanvas from "./LogoEffectCanvas";
import StyleSampleCard from "./StyleSampleCard";

interface EffectStyleTabProps<TPreset extends LogoEffectPresetBase> {
  intro: string;
  presets: TPreset[];
  effect: LogoEffectFactory<TPreset>;
  formatSpec: (preset: TPreset) => string;
}

/** 새 시안 공용 탭. 프리셋마다 아이콘·워드마크를 같은 효과로 그림. */
export default function EffectStyleTab<TPreset extends LogoEffectPresetBase>({
  intro,
  presets,
  effect,
  formatSpec,
}: EffectStyleTabProps<TPreset>) {
  return (
    <div className="flex flex-col gap-6">
      <p className={TAB_INTRO_CLASS}>{intro}</p>

      {presets.map((preset) => (
        <StyleSampleCard
          key={preset.id}
          name={preset.name}
          spec={formatSpec(preset)}
          description={preset.description}
          renderIcon={(iconSizeInCssPx) => (
            <LogoEffectCanvas
              effect={effect}
              preset={preset}
              sourceKind="icon"
              widthInCssPx={iconSizeInCssPx}
              heightInCssPx={iconSizeInCssPx}
            />
          )}
          renderWordmark={(sampleSize) => (
            <LogoEffectCanvas
              effect={effect}
              preset={preset}
              sourceKind="wordmark"
              widthInCssPx={sampleSize.widthInCssPx}
              heightInCssPx={sampleSize.heightInCssPx}
            />
          )}
        />
      ))}
    </div>
  );
}
