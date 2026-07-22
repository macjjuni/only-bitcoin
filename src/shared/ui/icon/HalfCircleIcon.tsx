import { memo } from "react";
import type { IconTypes } from "./icon";

/** 그라디언트 id 는 문서 전역이므로 아이콘 이름을 접두사로 붙여 충돌을 피한다. */
const GRADIENT_ID = {
  WARM_OUTER: "halfCircleIconWarmOuter",
  WARM_INNER: "halfCircleIconWarmInner",
  COOL_OUTER: "halfCircleIconCoolOuter",
  COOL_INNER: "halfCircleIconCoolInner",
} as const;

/** 4개 그라디언트가 공유하는 좌표계 변환. 원본 뷰박스(504) 기준으로 계산된 값이다. */
const GRADIENT_TRANSFORM = "matrix(7.8769 0 0 -7.8769 364.0687 4969.6704)";

/**
 * 원이 대각선으로 반씩 갈라진 아이콘.
 *
 * 반감기(Halving)의 "절반으로 나뉜다"는 의미를 담아, 따뜻한 색(보라~핑크) 반쪽과
 * 차가운 색(시안~블루) 반쪽이 서로 어긋나게 맞물린 형태다.
 * 고정 그라디언트를 쓰므로 `color` 는 받지 않는다.
 */
const HalfCircleIcon = ({ size = "100%", style, className }: IconTypes) => {
  return (
    <svg
      viewBox="0 0 504.121 504.121"
      width={size}
      height={size}
      style={style}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id={GRADIENT_ID.WARM_OUTER}
          gradientUnits="userSpaceOnUse"
          x1="0.9876"
          y1="635.5696"
          x2="-41.7784"
          y2="592.8036"
          gradientTransform={GRADIENT_TRANSFORM}
        >
          <stop offset="0.012" stopColor="#E0B386" />
          <stop offset="0.519" stopColor="#DA498C" />
          <stop offset="1" stopColor="#961484" />
        </linearGradient>
        <linearGradient
          id={GRADIENT_ID.WARM_INNER}
          gradientUnits="userSpaceOnUse"
          x1="-10.5885"
          y1="594.6306"
          x2="-22.2515"
          y2="637.6306"
          gradientTransform={GRADIENT_TRANSFORM}
        >
          <stop offset="0.012" stopColor="#E0B386" />
          <stop offset="0.519" stopColor="#DA498C" />
          <stop offset="1" stopColor="#961484" />
        </linearGradient>
        <linearGradient
          id={GRADIENT_ID.COOL_OUTER}
          gradientUnits="userSpaceOnUse"
          x1="-36.3259"
          y1="590.0163"
          x2="9.8745"
          y2="590.0163"
          gradientTransform={GRADIENT_TRANSFORM}
        >
          <stop offset="0" stopColor="#29D3DA" />
          <stop offset="0.519" stopColor="#0077FF" />
          <stop offset="0.999" stopColor="#064093" />
          <stop offset="1" stopColor="#084698" />
        </linearGradient>
        <linearGradient
          id={GRADIENT_ID.COOL_INNER}
          gradientUnits="userSpaceOnUse"
          x1="-10.6996"
          y1="616.5791"
          x2="-15.3646"
          y2="555.9151"
          gradientTransform={GRADIENT_TRANSFORM}
        >
          <stop offset="0" stopColor="#29D3DA" />
          <stop offset="0.519" stopColor="#0077FF" />
          <stop offset="0.999" stopColor="#064093" />
          <stop offset="1" stopColor="#084698" />
        </linearGradient>
      </defs>

      <path
        fill={`url(#${GRADIENT_ID.WARM_OUTER})`}
        d="M426.187,52.547C339.383-21.331,208.965-17.329,126.95,64.685 C44.944,146.7,40.942,277.102,114.82,363.914L426.187,52.547z"
      />
      <path
        fill={`url(#${GRADIENT_ID.WARM_INNER})`}
        d="M126.95,64.685C44.944,146.7,40.942,277.102,114.82,363.914L426.187,52.547"
      />
      <path
        fill={`url(#${GRADIENT_ID.COOL_OUTER})`}
        d="M389.299,140.194L77.932,451.56c86.812,73.893,217.214,69.892,299.229-12.123 S463.185,227.021,389.299,140.194z"
      />
      <path
        fill={`url(#${GRADIENT_ID.COOL_INNER})`}
        d="M377.161,439.438c82.015-82.014,86.024-212.417,12.138-299.244L77.932,451.56"
      />
    </svg>
  );
};

export default memo(HalfCircleIcon);
