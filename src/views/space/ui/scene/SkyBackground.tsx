"use client";

import { useLoader, useThree } from "@react-three/fiber";
import { memo, type ReactNode, useLayoutEffect } from "react";
import { EquirectangularReflectionMapping, SRGBColorSpace, TextureLoader } from "three";

/**
 * 360° 노을 파노라마 하늘.
 *
 * 2:1 equirectangular 한 장을 `scene.background` 에 건다. 수평선이 이미지 세로
 * 한가운데라 적도에 정확히 얹힌다.
 *
 * 하늘을 단색에서 그림으로 바꾼 이유는 **수평선**이다. 섬은 사방이 바다라
 * 시선의 절반이 하늘과 수평선인데, 단색이면 600 m 바다 평면이 끝나는 자리가
 * 그냥 색이 바뀌는 띠로 보인다. 파노라마에는 먼 섬과 폭포가 그려져 있어
 * 그 띠가 **군도의 수평선**으로 읽힌다.
 *
 * **해상도가 이 하늘의 한계다.** 원본은 1774 × 887 로 도당 4.9 px 뿐인데,
 * 가로 FOV 84° 를 1515 px 화면에 그리면 3.7배로 확대된다. Lanczos 로 2배
 * 키우고 약하게 샤프닝해 도당 9.9 px 로 올려 뒀다 — 없는 정보가 생기지는
 * 않지만, GPU 의 양선형 확대 대신 좋은 필터가 먼저 일하게 해 뭉개짐이 준다.
 * 더 선명하게 하려면 **원본을 4096 × 2048 이상으로 다시 뽑는 수밖에 없다.**
 *
 * 이방성 필터는 걸어 봐야 소용없다. 확대 구간이라 `magFilter` 만 타고,
 * 이방성은 축소(`minFilter`)에서만 동작한다.
 */

export const SKY_TEXTURE_URL = "/images/360.webp";

/**
 * 파노라마를 돌려 그려진 태양을 광원 방향에 맞춘다(라디안).
 *
 * three 는 방향 벡터를 `u = atan2(z, x) / 2π + 0.5` 로 샘플링한다. 그림의 해가
 * 가로 한가운데(u = 0.5)에 있으니 기본 상태에서는 **+X 쪽**에 뜬다. 그대로 두면
 * 그림자는 한쪽을 가리키는데 해는 엉뚱한 데 있어, 보는 사람이 집어내지는
 * 못해도 어딘가 어색하다고 느낀다.
 *
 * `SceneLighting` 의 태양 방위각과 같은 값이다. 둘 중 하나만 바꾸면 다시
 * 어긋나므로 `SceneLighting` 쪽에 주석을 걸어 뒀다.
 */
export const SKY_ROTATION_Y = Math.atan2(34, -48);

function SkyBackground(): ReactNode {
  // region [Hooks]
  const scene = useThree((rootState) => rootState.scene);
  const texture = useLoader(TextureLoader, SKY_TEXTURE_URL);
  // endregion

  // region [Life Cycles]
  useLayoutEffect(() => {
    // 구면 배경으로 쓰려면 매핑을 바꿔 줘야 한다. 기본값(UV)이면 평면으로 깔린다.
    texture.mapping = EquirectangularReflectionMapping;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;

    const previousBackground = scene.background;
    const previousRotation = scene.backgroundRotation.y;

    scene.background = texture;
    scene.backgroundRotation.y = SKY_ROTATION_Y;

    return () => {
      // 텍스처는 `useLoader` 캐시가 들고 있으므로 해제하지 않는다. 배경만 되돌린다.
      scene.background = previousBackground;
      scene.backgroundRotation.y = previousRotation;
    };
  }, [scene, texture]);
  // endregion

  return null;
}

const MemoizedSkyBackground = memo(SkyBackground);
MemoizedSkyBackground.displayName = "SkyBackground";

export default MemoizedSkyBackground;
