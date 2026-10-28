"use client";

import { formatHashStreamPresetSpec, HASH_STREAM_PRESETS } from "@/shared/lib/wordmark-canvas";
import { hashStreamEffect } from "../lib/legacyEffectAdapters";
import { TAB_INTRO_CLASS } from "../model/sampleLayout";
import HashStreamWordmark from "./HashStreamWordmark";
import LogoEffectCanvas from "./LogoEffectCanvas";
import StyleSampleCard from "./StyleSampleCard";

export default function HashStreamStyleTab() {
  return (
    <div className="flex flex-col gap-6">
      <p className={TAB_INTRO_CLASS}>
        글리프 안쪽에서만 문자가 아래로 흐름. 아이콘은 원 안, B 바깥에서 흐르고, 늘 흐르는 시안이라
        재생 모드 구분 없음.
      </p>

      {HASH_STREAM_PRESETS.map((preset) => (
        <StyleSampleCard
          key={preset.id}
          name={preset.name}
          spec={formatHashStreamPresetSpec(preset)}
          description={preset.description}
          renderIcon={(iconSizeInCssPx) => (
            <LogoEffectCanvas
              effect={hashStreamEffect}
              preset={preset}
              sourceKind="icon"
              fillColor={preset.streamColor}
              widthInCssPx={iconSizeInCssPx}
              heightInCssPx={iconSizeInCssPx}
            />
          )}
          renderWordmark={(sampleSize) => (
            <HashStreamWordmark
              preset={preset}
              widthInCssPx={sampleSize.widthInCssPx}
              heightInCssPx={sampleSize.heightInCssPx}
            />
          )}
        />
      ))}
    </div>
  );
}
