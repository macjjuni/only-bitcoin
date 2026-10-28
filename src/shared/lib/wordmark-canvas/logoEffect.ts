import type { BakedWordmark } from "./bakeWordmarkCanvas";

/**
 * 랩 시안 공용 타입.
 *
 * 아이콘도 워드마크와 같은 `BakedWordmark` 모양으로 구움. 그래서 글리치·해시 스트림 컨트롤러를
 * 아이콘에도 그대로 붙일 수 있음.
 */

// region [Types]
/** 시안이 그릴 원본. */
export type LogoSourceKind = "icon" | "wordmark";

/** 워드마크·아이콘 공용 텍스처. */
export type BakedLogoSource = BakedWordmark;

export interface LogoEffectController {
  start(): void;
  stop(): void;
  /** 클릭 시 호출. 타임라인을 처음으로 돌리거나 새 프레임을 뽑음. */
  trigger(): void;
  destroy(): void;
}

export interface LogoEffectContext<TPreset> {
  canvas: HTMLCanvasElement;
  bakedSource: BakedLogoSource;
  sourceKind: LogoSourceKind;
  preset: TPreset;
}

/** 시안 효과 팩토리. 모듈 스코프 상수로 둬야 effect 의존성이 안 흔들림. */
export type LogoEffectFactory<TPreset> = (
  context: LogoEffectContext<TPreset>,
) => LogoEffectController | Promise<LogoEffectController>;

export interface LogoEffectPresetBase {
  id: string;
  name: string;
  description: string;
}
// endregion
