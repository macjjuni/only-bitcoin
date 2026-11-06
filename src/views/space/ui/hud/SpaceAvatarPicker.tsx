"use client";

import { memo, type ReactNode, useState } from "react";
import { SPACE_AVATAR_MODELS } from "@/entities/space";

interface SpaceAvatarPickerProps {
  /** 지금 쓰는 모델 번호. 서버가 확정한 값임. */
  modelIndex: number;
  /** 저장·서버 전파까지 호출부가 맡음. */
  onChangeModel: (modelIndex: number) => Promise<boolean>;
  onClose: () => void;
}

/**
 * 아바타 모델 선택 패널.
 *
 * 모델마다 버튼 하나씩 세로로 둠. 미리보기 3D 는 띄우지 않음. 패널 안에 캔버스를
 * 따로 만드는 비용이 선택 한 번에 비해 과함. 대신 바꾸면 **화면의 내 아바타가
 * 바로 바뀜** — 그게 미리보기임.
 */
// biome-ignore format: AGENTS.md requires two blank lines between regions.
function SpaceAvatarPicker({ modelIndex, onChangeModel, onClose }: SpaceAvatarPickerProps): ReactNode {
  // region [Hooks]
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  // endregion


  // region [Events]
  const onClickModel = async (nextIndex: number): Promise<void> => {
    if (nextIndex === modelIndex || pendingIndex !== null) {
      return;
    }

    setPendingIndex(nextIndex);
    await onChangeModel(nextIndex);
    setPendingIndex(null);
  };
  // endregion

  return (
    <div className="pointer-events-auto w-56 rounded-xl border border-white/15 bg-[#10151f]/95 p-3 shadow-lg backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-white/85">아바타</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-1 text-xs text-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bitcoin"
        >
          닫기
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {SPACE_AVATAR_MODELS.map((model, index) => {
          const isSelected = index === modelIndex;

          return (
            <button
              key={model.id}
              type="button"
              aria-pressed={isSelected}
              disabled={pendingIndex !== null}
              onClick={() => {
                void onClickModel(index);
              }}
              className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors disabled:opacity-60 ${
                isSelected
                  ? "border-bitcoin/70 bg-bitcoin/15"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              {/* 모델마다 고정 색. 플레이어 색은 모델에 입혀지므로 여기선 모델을 구분하는 데만 씀. */}
              <span
                aria-hidden="true"
                className="size-4 shrink-0 rounded-full border border-black/30"
                style={{ backgroundColor: model.swatchColor }}
              />
              <span className="min-w-0 flex-1 text-sm font-medium text-white/90">
                {model.label}
              </span>
              {pendingIndex === index && <span className="text-[11px] text-white/50">변경 중</span>}
              {isSelected && pendingIndex === null && (
                <span className="text-[11px] font-semibold text-bitcoin">사용 중</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const MemoizedSpaceAvatarPicker = memo(SpaceAvatarPicker);
MemoizedSpaceAvatarPicker.displayName = "SpaceAvatarPicker";

export default MemoizedSpaceAvatarPicker;
