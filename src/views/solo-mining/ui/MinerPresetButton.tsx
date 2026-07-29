"use client";

import { KButton } from "kku-ui";
import type { MinerPreset } from "../model/constants";

interface MinerPresetButtonProps {
  preset: MinerPreset;
  onSelect: (preset: MinerPreset) => void;
}

export default function MinerPresetButton({ preset, onSelect }: MinerPresetButtonProps) {
  // region [Events]
  const onClickPreset = () => {
    onSelect(preset);
  };
  // endregion

  return (
    <KButton
      variant="outline"
      size="sm"
      className="flex justify-between gap-1 h-9 text-xs"
      onClick={onClickPreset}
    >
      <span className="truncate">{preset.name}</span>
      <span className="shrink-0 font-number text-muted-foreground">
        {preset.hashrate}
        {preset.unit}
      </span>
    </KButton>
  );
}
