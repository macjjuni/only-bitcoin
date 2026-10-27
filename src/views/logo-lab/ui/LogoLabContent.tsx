"use client";

import { type MouseEvent, useState } from "react";
import {
  formatGlitchPresetSpec,
  GLITCH_PRESETS,
  type GlitchPlaybackMode,
  type GlitchPreset,
  WORDMARK_FONTS,
  type WordmarkFontId,
} from "@/shared/lib/wordmark-canvas";
import { BtcTextLogo, GlitchWordmark, PageTitle } from "@/shared/ui";

// region [Types]
interface WordmarkSampleSize {
  id: string;
  label: string;
  widthInCssPx: number;
  heightInCssPx: number;
}

interface PlaybackModeOption {
  mode: GlitchPlaybackMode;
  label: string;
  hint: string;
}
// endregion

// region [Constants]
/**
 * 실제 사용처와 같은 크기로만 비교한다.
 *
 * 글리치는 크기에 따라 체감이 완전히 달라진다. 3px 채널 분리는 64px 로고에서는 은은하지만
 * 32px 헤더에서는 글자가 뭉개진 것처럼 보인다. 그래서 임의의 크기가 아니라
 * 현재 `BtcTextLogo` 가 실제로 쓰이는 세 크기를 그대로 늘어놓는다.
 */
const WORDMARK_SAMPLE_SIZES: WordmarkSampleSize[] = [
  { id: "header", label: "헤더 132 × 32", widthInCssPx: 132, heightInCssPx: 32 },
  { id: "share-card", label: "공유 카드 156 × 36", widthInCssPx: 156, heightInCssPx: 36 },
  { id: "hero", label: "대형 264 × 64", widthInCssPx: 264, heightInCssPx: 64 },
];

/**
 * 재생 모드 선택지.
 *
 * `frozen` 을 기본값으로 둔다. `production` 의 버스트는 수십 ms 라 네 프리셋이 서로 다른
 * 시각에 튀는 상태로는 차이를 볼 수가 없다. 멈춰 세워 놓고 봐야 비교가 된다.
 */
const PLAYBACK_MODE_OPTIONS: PlaybackModeOption[] = [
  {
    mode: "frozen",
    label: "글리치 고정",
    hint: "글리치 한 프레임을 멈춰 세운다. 채널 분리 폭·띠 개수·스캔라인을 직접 비교할 수 있는 모드. 로고를 누르면 다른 프레임을 다시 뽑는다.",
  },
  {
    mode: "continuous",
    label: "연속 재생",
    hint: "쉬지 않고 글리치를 갈아 끼운다. 움직임의 성격과 거슬리는 정도를 보는 모드. 실제 동작보다 훨씬 과격하다.",
  },
  {
    mode: "production",
    label: "실제 동작",
    hint: "서비스에 나갈 동작. 대기 중에는 멈춰 있고 몇 초마다 짧게 튄다. 로고를 누르면 대기를 건너뛴다.",
  },
];

/** 시안을 얹는 어두운 패널. 사이퍼펑크 톤은 라이트 배경에서 평가가 불가능하다. */
const SAMPLE_PANEL_CLASS =
  "flex flex-col gap-5 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-5";

const SAMPLE_LABEL_CLASS = "text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500";

/** 폰트 선택지. 캔버스에 인라인해 구울 수 있는 폰트만 올린다. */
const WORDMARK_FONT_OPTIONS: WordmarkFontId[] = ["pretendard", "jetbrains"];

const SPEC_CLASS = "font-jetbrains text-[11px] leading-relaxed tracking-tight text-neutral-500";
// endregion

export default function LogoLabContent() {
  // region [Hooks]
  const [playbackMode, setPlaybackMode] = useState<GlitchPlaybackMode>("continuous");
  const [fontId, setFontId] = useState<WordmarkFontId>("pretendard");
  // endregion

  // region [Events]
  /**
   * 선택한 모드는 `data-mode` 로 읽는다.
   *
   * JSX 안에서 `onClick={() => ...}` 로 인자를 넘기지 않기 위함이다. 리스트 렌더에서
   * 익명 함수를 만들면 항목마다 매 렌더 새 함수가 생겨 메모이제이션이 전부 무력해진다.
   */
  const onClickPlaybackModeButton = (event: MouseEvent<HTMLButtonElement>) => {
    const selectedMode = event.currentTarget.dataset.mode as GlitchPlaybackMode | undefined;

    if (selectedMode === undefined) {
      return;
    }
    setPlaybackMode(selectedMode);
  };

  /** 선택한 폰트는 `data-font-id` 로 읽는다. 이유는 위 핸들러와 같다. */
  const onClickFontButton = (event: MouseEvent<HTMLButtonElement>) => {
    const selectedFontId = event.currentTarget.dataset.fontId as WordmarkFontId | undefined;

    if (selectedFontId === undefined) {
      return;
    }
    setFontId(selectedFontId);
  };
  // endregion

  // region [Templates]
  const selectedModeOption =
    PLAYBACK_MODE_OPTIONS.find((option) => option.mode === playbackMode) ??
    PLAYBACK_MODE_OPTIONS[0];

  const PlaybackModeSwitchTemplate = (
    <div className="flex flex-col gap-2 px-1">
      <div className="flex flex-wrap gap-1.5">
        {PLAYBACK_MODE_OPTIONS.map((option) => {
          const isSelectedMode = option.mode === playbackMode;

          return (
            <button
              key={option.mode}
              type="button"
              aria-pressed={isSelectedMode}
              data-mode={option.mode}
              onClick={onClickPlaybackModeButton}
              className={[
                "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
                isSelectedMode
                  ? "border-bitcoin bg-bitcoin/15 text-bitcoin"
                  : "border-neutral-700 text-neutral-400 hover:text-neutral-200",
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-[12px] leading-relaxed text-muted-foreground">{selectedModeOption.hint}</p>
    </div>
  );

  const FontSwitchTemplate = (
    <div className="flex flex-col gap-2 px-1">
      <div className="flex flex-wrap gap-1.5">
        {WORDMARK_FONT_OPTIONS.map((optionFontId) => {
          const isSelectedFont = optionFontId === fontId;

          return (
            <button
              key={optionFontId}
              type="button"
              aria-pressed={isSelectedFont}
              data-font-id={optionFontId}
              onClick={onClickFontButton}
              className={[
                "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
                isSelectedFont
                  ? "border-bitcoin bg-bitcoin/15 text-bitcoin"
                  : "border-neutral-700 text-neutral-400 hover:text-neutral-200",
              ].join(" ")}
            >
              {WORDMARK_FONTS[optionFontId].label}
            </button>
          );
        })}
      </div>
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        워드마크를 조판할 폰트. 캔버스는 페이지 CSS 가 닿지 않으므로 선택한 폰트의 woff2 를 base64
        로 SVG 안에 인라인해서 굽습니다. Pretendard 는 기존 로고와 같은 비례 폰트, JetBrains Mono 는
        등폭 터미널 폰트입니다.
      </p>
    </div>
  );

  const renderPresetCard = (preset: GlitchPreset) => {
    return (
      <section key={preset.id} className="flex flex-col gap-2.5">
        <header className="flex flex-col gap-1 px-1">
          <h2 className="font-jetbrains text-[15px] font-bold tracking-tight text-bitcoin">
            {preset.name}
          </h2>
          <p className={SPEC_CLASS}>{formatGlitchPresetSpec(preset)}</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{preset.description}</p>
        </header>

        <div className={SAMPLE_PANEL_CLASS}>
          {WORDMARK_SAMPLE_SIZES.map((sampleSize) => (
            <div key={sampleSize.id} className="flex flex-col gap-2">
              <span className={SAMPLE_LABEL_CLASS}>{sampleSize.label}</span>
              <GlitchWordmark
                preset={preset}
                playbackMode={playbackMode}
                fontId={fontId}
                widthInCssPx={sampleSize.widthInCssPx}
                heightInCssPx={sampleSize.heightInCssPx}
              />
            </div>
          ))}
        </div>
      </section>
    );
  };
  // endregion

  return (
    <div className="flex flex-col gap-6 font-pretendard">
      <PageTitle
        label="Logo Lab"
        title="사이퍼펑크 워드마크 시안"
        description="HTML/CSS 로 조판한 워드마크를 캔버스에 구워 넣고, 채널 분리·가로 띠 변위로 글리치를 입힌 시안입니다."
      />

      {PlaybackModeSwitchTemplate}

      {FontSwitchTemplate}

      <section className="flex flex-col gap-2.5">
        <header className="flex flex-col gap-1 px-1">
          <h2 className="font-jetbrains text-[15px] font-bold tracking-tight text-neutral-400">
            현재 로고 (기준)
          </h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            비교 기준인 지금의 <code className="font-jetbrains">BtcTextLogo</code>. 시안은 등폭
            폰트(JetBrains Mono)라 자폭과 자간이 여기와 다릅니다.
          </p>
        </header>

        <div className={SAMPLE_PANEL_CLASS}>
          {WORDMARK_SAMPLE_SIZES.map((sampleSize) => (
            <div key={sampleSize.id} className="flex flex-col gap-2">
              <span className={SAMPLE_LABEL_CLASS}>{sampleSize.label}</span>
              <BtcTextLogo
                color="#fff"
                width={sampleSize.widthInCssPx}
                height={sampleSize.heightInCssPx}
              />
            </div>
          ))}
        </div>
      </section>

      {GLITCH_PRESETS.map(renderPresetCard)}

      <p className="px-1 pb-2 text-[12px] leading-relaxed text-muted-foreground">
        모션 줄이기(prefers-reduced-motion)를 켜면 연속 재생·실제 동작은 정지 프레임만 그려집니다.
        정지 이미지인 글리치 고정은 그대로 동작합니다. 화면 밖으로 스크롤되면 IntersectionObserver
        가 루프를 멈춥니다.
      </p>
    </div>
  );
}
