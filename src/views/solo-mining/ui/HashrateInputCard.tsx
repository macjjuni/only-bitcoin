"use client";

import type { ChangeEvent } from "react";
import {
  Card,
  CardContent,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  SegmentedControl,
  type SegmentedControlOption,
} from "@/shared/ui";
import { type HashrateUnit, HASHRATE_UNITS } from "../lib/hashrateUnit";
import { type MinerPreset, MINER_PRESETS } from "../model/constants";
import MinerPresetButton from "./MinerPresetButton";

const hashrateUnitOptions: Array<SegmentedControlOption<HashrateUnit>> = HASHRATE_UNITS.map(
  (unit) => ({ label: `${unit}/s`, value: unit }),
);

interface HashrateInputCardProps {
  hashrateInput: string;
  unit: HashrateUnit;
  isOverMax: boolean;
  onChangeHashrate: (hashrateInput: string) => void;
  onChangeUnit: (unit: HashrateUnit) => void;
  onSelectPreset: (preset: MinerPreset) => void;
}

export default function HashrateInputCard(props: HashrateInputCardProps) {
  const { hashrateInput, unit, isOverMax, onChangeHashrate, onChangeUnit, onSelectPreset } = props;

  // region [Events]
  const onChangeHashrateInput = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;

    if (text === "") {
      return onChangeHashrate("");
    }
    // 음수·지수 표기를 막고 소수점 있는 양수만 통과시킨다.
    if (!/^\d*\.?\d*$/.test(text)) {
      return;
    }

    onChangeHashrate(text);
  };

  const onChangeHashrateUnit = (nextUnit: HashrateUnit) => {
    onChangeUnit(nextUnit);
  };

  const onSelectPresetButton = (preset: MinerPreset) => {
    onSelectPreset(preset);
  };
  // endregion

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">내 채굴 해시레이트</span>
          <InputGroup size="sm" className="h-11">
            <InputGroupInput
              type="text"
              inputMode="decimal"
              maxLength={12}
              placeholder="1.2"
              value={hashrateInput}
              onChange={onChangeHashrateInput}
              className="font-number text-lg font-bold text-right h-full"
            />
            <InputGroupAddon align="inline-end" className="text-sm font-bold text-muted-foreground">
              {unit}/s
            </InputGroupAddon>
          </InputGroup>
          {isOverMax && (
            <p className="text-right text-xs text-down">
              네트워크 전체보다 큰 값은 입력할 수 없어요.
            </p>
          )}
        </div>

        <SegmentedControl
          size="sm"
          options={hashrateUnitOptions}
          value={unit}
          onChange={onChangeHashrateUnit}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">장비로 불러오기</span>
          <div className="grid grid-cols-2 gap-1.5">
            {MINER_PRESETS.map((preset) => (
              <MinerPresetButton
                key={preset.name}
                preset={preset}
                onSelect={onSelectPresetButton}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
