"use client";

import type { ChangeEvent } from "react";
import { Card, CardContent, InputGroup, InputGroupInput } from "@/shared/ui";
import { formatDifficulty } from "@/shared/utils/number";

interface NetworkDifficultyCardProps {
  liveDifficulty: number;
  manualDifficultyInput: string;
  isManualMode: boolean;
  onChangeManualDifficulty: (difficultyInput: string) => void;
  onToggleManualMode: () => void;
}

export default function NetworkDifficultyCard(props: NetworkDifficultyCardProps) {
  const {
    liveDifficulty,
    manualDifficultyInput,
    isManualMode,
    onChangeManualDifficulty,
    onToggleManualMode,
  } = props;

  // region [Privates]
  const hasLiveDifficulty = liveDifficulty > 0;
  // endregion

  // region [Events]
  const onChangeManualDifficultyInput = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;

    if (text === "") {
      return onChangeManualDifficulty("");
    }
    if (!/^\d*\.?\d*(e\+?\d+)?$/i.test(text)) {
      return;
    }

    onChangeManualDifficulty(text);
  };

  const onClickToggleManualMode = () => {
    onToggleManualMode();
  };
  // endregion

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">현재 채굴 난이도</span>
          <button
            type="button"
            className="text-xs font-bold text-bitcoin active:scale-[0.97]"
            onClick={onClickToggleManualMode}
          >
            {isManualMode ? "실시간 값 쓰기" : "직접 입력"}
          </button>
        </div>

        {isManualMode ? (
          <InputGroup size="sm" className="h-10">
            <InputGroupInput
              type="text"
              inputMode="decimal"
              maxLength={24}
              placeholder="140000000000000"
              value={manualDifficultyInput}
              onChange={onChangeManualDifficultyInput}
              className="font-number text-md font-bold text-right h-full"
            />
          </InputGroup>
        ) : (
          <strong className="font-number text-xl font-bold">
            {hasLiveDifficulty ? formatDifficulty(liveDifficulty) : "불러오는 중…"}
          </strong>
        )}

        {!hasLiveDifficulty && !isManualMode && (
          <p className="text-xs text-muted-foreground">
            mempool.space 연결을 기다리고 있어요. 연결이 안 되면 난이도를 직접 입력해 주세요.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
