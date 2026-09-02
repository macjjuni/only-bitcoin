"use client";

import type { ReactNode } from "react";
import { SegmentedControl, type SegmentedControlOption } from "@/shared/ui";
import type { BattleRendererMode, EffectDensity, WarControlState } from "../model/warViewModel";

interface WarControlsProps {
  controlState: WarControlState;
  onChangeEffectDensity: (effectDensity: EffectDensity) => void;
  onChangeRendererMode: (rendererMode: BattleRendererMode) => void;
}

const EFFECT_DENSITY_OPTIONS: Array<SegmentedControlOption<EffectDensity>> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const RENDERER_MODE_OPTIONS: Array<SegmentedControlOption<BattleRendererMode>> = [
  { label: "우주", value: "space" },
  { label: "도형", value: "classic" },
];

/**
 * 전장 표시 옵션 조작부.
 *
 * 호가벽과 체결 효과는 이 화면이 보여 주려는 것 자체라 끄는 버튼을 두지 않는다.
 * 사용자가 만질 것은 기기 성능에 맞춘 효과 밀도와 표현 방식뿐이다.
 */
export function WarControls({
  controlState,
  onChangeEffectDensity,
  onChangeRendererMode,
}: WarControlsProps): ReactNode {
  return (
    <section className="flex flex-col gap-2" aria-label="전장 표시 설정">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] text-muted-foreground">효과 밀도</span>
        <SegmentedControl
          options={EFFECT_DENSITY_OPTIONS}
          value={controlState.effectDensity}
          onChange={onChangeEffectDensity}
          size="sm"
          className="flex-1"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] text-muted-foreground">표현 방식</span>
        <SegmentedControl
          options={RENDERER_MODE_OPTIONS}
          value={controlState.rendererMode}
          onChange={onChangeRendererMode}
          size="sm"
          className="flex-1"
        />
      </div>
    </section>
  );
}
