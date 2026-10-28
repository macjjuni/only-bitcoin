"use client";

import { KIcon } from "kku-ui";
import { type MouseEvent, useState } from "react";
import {
  createDitherEffect,
  DITHER_PRESETS,
  formatDitherPresetSpec,
} from "@/shared/lib/wordmark-canvas";
import { BtcTextLogo, PageTitle } from "@/shared/ui";
import { createCrtEffect } from "../lib/createCrtEffect";
import { createDotMatrixEffect } from "../lib/createDotMatrixEffect";
import { createGuillocheEffect } from "../lib/createGuillocheEffect";
import { CRT_PRESETS, formatCrtPresetSpec } from "../model/crtPreset";
import { DOT_MATRIX_PRESETS, formatDotMatrixPresetSpec } from "../model/dotMatrixPreset";
import { formatGuillochePresetSpec, GUILLOCHE_PRESETS } from "../model/guillochePreset";
import {
  DEFAULT_LOGO_STYLE_TAB_ID,
  LOGO_STYLE_TABS,
  type LogoStyleTabId,
} from "../model/logoStyleTab";
import { resolveToggleButtonClass } from "../model/sampleLayout";
import EffectStyleTab from "./EffectStyleTab";
import GlitchStyleTab from "./GlitchStyleTab";
import HashStreamStyleTab from "./HashStreamStyleTab";
import StyleSampleCard from "./StyleSampleCard";

export default function LogoLabContent() {
  // region [Hooks]
  const [selectedTabId, setSelectedTabId] = useState<LogoStyleTabId>(DEFAULT_LOGO_STYLE_TAB_ID);
  // endregion

  // region [Events]
  const onClickStyleTab = (event: MouseEvent<HTMLButtonElement>) => {
    const clickedTabId = event.currentTarget.dataset.tabId as LogoStyleTabId | undefined;

    if (clickedTabId === undefined) {
      return;
    }
    setSelectedTabId(clickedTabId);
  };
  // endregion

  // region [Templates]
  const StyleTabListTemplate = (
    <div
      role="tablist"
      aria-label="로고 스타일"
      className="sticky top-header z-[5] -mx-1 flex flex-wrap gap-1.5 bg-[hsl(var(--background)/0.9)] px-1 py-2 backdrop-blur-[4px]"
    >
      {LOGO_STYLE_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={`logo-style-tab-${tab.id}`}
          aria-selected={tab.id === selectedTabId}
          aria-controls="logo-style-tab-panel"
          data-tab-id={tab.id}
          onClick={onClickStyleTab}
          className={resolveToggleButtonClass(tab.id === selectedTabId)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  /** 탭마다 시안이 수십 개라 선택된 탭만 마운트함. 숨겨 두면 캔버스·폰트 굽기가 전부 돎. */
  const renderStyleTabPanel = () => {
    switch (selectedTabId) {
      case "glitch":
        return <GlitchStyleTab />;
      case "crt":
        return (
          <EffectStyleTab
            intro="브라운관 형광체 질감. 스캔라인·번짐·약한 깜빡임·천천히 내려가는 밝은 띠. 아이콘·워드마크가 같은 형광색·같은 주기라 한 화면처럼 보임."
            presets={CRT_PRESETS}
            effect={createCrtEffect}
            formatSpec={formatCrtPresetSpec}
          />
        );
      case "hash-stream":
        return <HashStreamStyleTab />;
      case "dot-matrix":
        return (
          <EffectStyleTab
            intro="거래소 전광판 LED. 꺼진 도트까지 박스 전체에 깔아야 전광판으로 읽힘. 시세 사이트 맥락에 가장 직접적으로 붙는 시안."
            presets={DOT_MATRIX_PRESETS}
            effect={createDotMatrixEffect}
            formatSpec={formatDotMatrixPresetSpec}
          />
        );
      case "guilloche":
        return (
          <EffectStyleTab
            intro="글자 안을 지폐 위조 방지 곡선으로 채움. 사이퍼펑크 반대편의 '건전화폐' 톤이라 비교 기준점으로 둠. 선이 가늘어 대형에서 진가가 남."
            presets={GUILLOCHE_PRESETS}
            effect={createGuillocheEffect}
            formatSpec={formatGuillochePresetSpec}
          />
        );
      case "dither":
        return (
          <EffectStyleTab
            intro="글자 안 명암을 베이어 행렬로 1비트 점묘함. 90년대 사이퍼펑크 진·팩스·감열지 질감."
            presets={DITHER_PRESETS}
            effect={createDitherEffect}
            formatSpec={formatDitherPresetSpec}
          />
        );
      default:
        return null;
    }
  };
  // endregion

  return (
    <div className="flex flex-col gap-6 font-pretendard">
      <PageTitle
        label="Logo Lab"
        title="사이퍼펑크 로고 시안"
        description="헤더 아이콘과 워드마크를 스타일별로 실제 사용 크기에서 비교하는 페이지입니다. 시안을 누르면 애니메이션이 처음부터 다시 재생됩니다."
      />

      <StyleSampleCard
        name="현재 로고 (기준)"
        spec="KIcon bitcoin · BtcTextLogo"
        description="비교 기준인 지금의 아이콘과 워드마크."
        renderIcon={(iconSizeInCssPx) => <KIcon icon="bitcoin" size={iconSizeInCssPx} />}
        renderWordmark={(sampleSize) => (
          <BtcTextLogo
            color="#fff"
            width={sampleSize.widthInCssPx}
            height={sampleSize.heightInCssPx}
          />
        )}
      />

      {StyleTabListTemplate}

      <div
        id="logo-style-tab-panel"
        role="tabpanel"
        aria-labelledby={`logo-style-tab-${selectedTabId}`}
      >
        {renderStyleTabPanel()}
      </div>

      <p className="px-1 pb-2 text-[12px] leading-relaxed text-muted-foreground">
        모션 줄이기(prefers-reduced-motion)를 켜면 움직이는 시안은 정지 프레임만 그림. 화면 밖으로
        스크롤되면 IntersectionObserver 가 루프를 멈춤.
      </p>
    </div>
  );
}
