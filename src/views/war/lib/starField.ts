/** 깊이 레이어 한 겹의 생성 규칙. 멀수록 작고 어둡고 느리게 흐른다. */
interface StarLayerProfile {
  /** 캔버스 넓이 100,000px² 당 별 개수. 창 크기가 변해도 밀도가 일정하게 유지된다. */
  starCountPerAreaUnit: number;
  minRadiusInPx: number;
  maxRadiusInPx: number;
  minAlpha: number;
  maxAlpha: number;
  /** 전선 이동량에 곱하는 계수. 클수록 앞쪽에 있어 크게 밀린다. */
  parallaxFactor: number;
}

const STAR_LAYER_PROFILES: StarLayerProfile[] = [
  {
    starCountPerAreaUnit: 26,
    minRadiusInPx: 0.4,
    maxRadiusInPx: 0.9,
    minAlpha: 0.22,
    maxAlpha: 0.45,
    parallaxFactor: 0.25,
  },
  {
    starCountPerAreaUnit: 14,
    minRadiusInPx: 0.7,
    maxRadiusInPx: 1.4,
    minAlpha: 0.35,
    maxAlpha: 0.65,
    parallaxFactor: 0.55,
  },
  {
    starCountPerAreaUnit: 6,
    minRadiusInPx: 1.1,
    maxRadiusInPx: 2.1,
    minAlpha: 0.55,
    maxAlpha: 0.95,
    parallaxFactor: 1,
  },
];

const AREA_UNIT_IN_SQUARE_PX = 100_000;

/** 별에 살짝 섞는 색. 전부 흰 점이면 인쇄물처럼 납작해 보인다. */
const STAR_TINTS = ["255 255 255", "191 219 254", "254 240 138", "196 181 253"];

interface StarLayer {
  /** 미리 그려 둔 별 그림. 매 프레임 점을 다시 찍지 않고 이 한 장을 밀어서 쓴다. */
  layerCanvas: HTMLCanvasElement;
  parallaxFactor: number;
  scrollOffsetInPx: number;
}

/**
 * 배경 별필드.
 *
 * 별 위치는 크기가 바뀔 때 한 번만 뽑아 레이어 캔버스에 구워 둔다. 매 프레임 수백 개의
 * 점을 다시 찍으면 그것만으로 예산을 다 쓰고, 위치를 매번 새로 뽑으면 별이 반짝이는
 * 게 아니라 아예 다른 하늘이 되어 버린다.
 *
 * 그리기는 레이어당 `drawImage` 두 번이다. 한 장은 현재 위치, 한 장은 이어 붙일 자리에
 * 놓아 가로로 무한히 이어지게 한다.
 */
export class StarField {
  private layers: StarLayer[] = [];
  private canvasWidthInPx = 0;
  private canvasHeightInPx = 0;
  private lastFrontLineRatio = 0.5;

  /** 크기가 바뀌면 레이어를 다시 굽는다. 같은 크기로 다시 불려도 낭비하지 않는다. */
  resize(widthInPx: number, heightInPx: number): void {
    const hasSameSize = this.canvasWidthInPx === widthInPx && this.canvasHeightInPx === heightInPx;

    if (hasSameSize || widthInPx <= 0 || heightInPx <= 0) {
      return;
    }

    this.canvasWidthInPx = widthInPx;
    this.canvasHeightInPx = heightInPx;
    this.layers = STAR_LAYER_PROFILES.map((profile) => ({
      layerCanvas: this.bakeLayerCanvas(profile, widthInPx, heightInPx),
      parallaxFactor: profile.parallaxFactor,
      scrollOffsetInPx: 0,
    }));
  }

  /** 레이어 하나를 오프스크린 캔버스에 구워 둔다. */
  private bakeLayerCanvas(
    profile: StarLayerProfile,
    widthInPx: number,
    heightInPx: number,
  ): HTMLCanvasElement {
    const layerCanvas = document.createElement("canvas");
    layerCanvas.width = widthInPx;
    layerCanvas.height = heightInPx;

    const layerContext = layerCanvas.getContext("2d");

    if (layerContext === null) {
      return layerCanvas;
    }

    const canvasAreaInSquarePx = widthInPx * heightInPx;
    const starCount = Math.round(
      (canvasAreaInSquarePx / AREA_UNIT_IN_SQUARE_PX) * profile.starCountPerAreaUnit,
    );

    for (let starIndex = 0; starIndex < starCount; starIndex += 1) {
      const radiusInPx =
        profile.minRadiusInPx + Math.random() * (profile.maxRadiusInPx - profile.minRadiusInPx);
      const alpha = profile.minAlpha + Math.random() * (profile.maxAlpha - profile.minAlpha);
      const tint = STAR_TINTS[Math.floor(Math.random() * STAR_TINTS.length)];

      layerContext.fillStyle = `rgba(${tint.split(" ").join(", ")}, ${alpha})`;
      layerContext.beginPath();
      layerContext.arc(
        Math.random() * widthInPx,
        Math.random() * heightInPx,
        radiusInPx,
        0,
        Math.PI * 2,
      );
      layerContext.fill();
    }

    return layerCanvas;
  }

  /**
   * 전선이 움직인 만큼 별을 반대로 민다.
   *
   * 매수가 밀어붙여 전선이 오른쪽으로 가면 시점이 오른쪽으로 따라가는 셈이라 배경은
   * 왼쪽으로 흘러야 한다. 움직임 최소화에서는 아예 멈춘다.
   */
  update(frontLineRatio: number, isReducedMotion: boolean): void {
    const frontLineDeltaRatio = frontLineRatio - this.lastFrontLineRatio;
    this.lastFrontLineRatio = frontLineRatio;

    if (isReducedMotion || this.canvasWidthInPx <= 0) {
      return;
    }

    const frontLineDeltaInPx = frontLineDeltaRatio * this.canvasWidthInPx;

    for (const layer of this.layers) {
      const nextOffsetInPx =
        layer.scrollOffsetInPx - frontLineDeltaInPx * layer.parallaxFactor * 2.2;

      // 한 화면 폭 단위로 감아 둬야 오래 켜 둬도 좌표가 커지지 않는다.
      layer.scrollOffsetInPx =
        ((nextOffsetInPx % this.canvasWidthInPx) + this.canvasWidthInPx) % this.canvasWidthInPx;
    }
  }

  /** 레이어를 뒤에서 앞 순서로 깐다. */
  draw(context: CanvasRenderingContext2D): void {
    for (const layer of this.layers) {
      const offsetInPx = layer.scrollOffsetInPx;

      context.drawImage(layer.layerCanvas, offsetInPx, 0);
      context.drawImage(layer.layerCanvas, offsetInPx - this.canvasWidthInPx, 0);
    }
  }
}
