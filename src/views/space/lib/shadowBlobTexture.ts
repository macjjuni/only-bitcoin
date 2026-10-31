import { CanvasTexture, type Texture } from "three";

const TEXTURE_SIZE = 128;

/**
 * 접지 그림자용 방사형 그라데이션 텍스처.
 *
 * 아바타 50명에 실시간 그림자 맵을 쓰면 예산을 넘기므로 블롭 텍스처 한 장을
 * 모든 아바타가 공유한다. 호출자가 캐시해 재사용해야 한다.
 */
export const createShadowBlobTexture = (): Texture => {
  const canvasElement = document.createElement("canvas");
  canvasElement.width = TEXTURE_SIZE;
  canvasElement.height = TEXTURE_SIZE;

  const context = canvasElement.getContext("2d");

  if (!context) {
    return new CanvasTexture(canvasElement);
  }

  const center = TEXTURE_SIZE / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0.55)");
  gradient.addColorStop(0.6, "rgba(0, 0, 0, 0.22)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  return new CanvasTexture(canvasElement);
};
