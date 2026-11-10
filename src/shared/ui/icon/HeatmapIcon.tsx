import { memo } from "react";
import type { IconTypes } from "./icon";

const DOWN_COLOR = "#ef4444";
const UP_COLOR = "#22c55e";
const NEUTRAL_COLOR = "#ffffff";
const CELL_STROKE_COLOR = "#000000";

/** 4×4 칸 색. 왼쪽 위는 하락( 빨강 ), 오른쪽 아래는 상승( 초록 )으로 번지는 모양. */
const CELL_COLOR_ROWS = [
  [DOWN_COLOR, DOWN_COLOR, NEUTRAL_COLOR, UP_COLOR],
  [DOWN_COLOR, NEUTRAL_COLOR, NEUTRAL_COLOR, UP_COLOR],
  [NEUTRAL_COLOR, NEUTRAL_COLOR, NEUTRAL_COLOR, UP_COLOR],
  [NEUTRAL_COLOR, NEUTRAL_COLOR, UP_COLOR, UP_COLOR],
];

/** 원본 SVG 좌표계( 2253 기준 ) 값. */
const CELL_SIZE = 495.833;
const GRID_OFFSET_X = 134.621;
const GRID_OFFSET_Y = 133.333;
const CELL_STROKE_WIDTH = 66.67;
/** 원본의 바깥 여백을 잘라 격자( 테두리 포함 )만 남긴 뷰박스. */
const GRID_VIEW_BOX = "101 100 2050 2050";

const HEATMAP_CELLS = CELL_COLOR_ROWS.flatMap((rowColors, rowIndex) => {
  return rowColors.map((fill, columnIndex) => ({
    id: `${rowIndex}-${columnIndex}`,
    x: GRID_OFFSET_X + CELL_SIZE * columnIndex,
    y: GRID_OFFSET_Y + CELL_SIZE * rowIndex,
    fill,
  }));
});

/**
 * 히트맵 메뉴 아이콘.
 *
 * 비트코인 코인을 뒤에 깔고 히트맵 격자를 앞에 겹침.
 * 코인 배치는 `TreasuryIcon` 과 같음. 격자는 꽉 찬 네모라 같은 41 크기면 혼자 커 보여서
 * 33 으로 줄여서 코인 쪽으로 조금 당겨 놓음. 격자가 불투명해서 뒤 코인이 자연히 파여 보임.
 * `color` 는 코인 색이고 격자 칸 색은 등락 색으로 고정임.
 */
const HeatmapIcon = ({ size = "100%", color = "currentColor", style, className }: IconTypes) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      style={style}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.52 13.67C13.25 14.76 11.42 14.17 10.82 14.02L11.3 12.09C11.9 12.24 13.8 12.53 13.52 13.67ZM11.96 9.45003L11.52 11.2C12.02 11.32 13.55 11.83 13.8 10.84C14.05 9.81003 12.46 9.57003 11.96 9.45003ZM19.76 13.93C18.69 18.21 14.35 20.82 10.06 19.76C5.78 18.69 3.16 14.35 4.23 10.07C5.3 5.78003 9.64 3.18003 13.93 4.24003C18.21 5.31003 20.83 9.65003 19.76 13.93ZM9.37 13.34C9.33 13.45 9.22 13.61 8.97 13.55C8.93 13.55 8.33 13.39 8.33 13.39L7.89 14.39L9.03 14.67C9.25 14.73 9.45 14.78 9.66 14.84L9.3 16.29L10.17 16.51L10.53 15.07C10.77 15.14 11 15.19 11.23 15.25L10.87 16.68L11.75 16.9L12.11 15.45C13.61 15.73 14.74 15.62 15.21 14.26C15.59 13.17 15.19 12.54 14.4 12.13C14.97 12 15.4 11.62 15.52 10.84C15.68 9.78003 14.87 9.20003 13.76 8.83003L14.12 7.38003L13.24 7.16003L12.89 8.56003C12.66 8.50003 12.42 8.45003 12.18 8.39003L12.53 6.98003L11.66 6.76003L11.3 8.20003C11.11 8.16003 10.92 8.11003 10.74 8.07003L9.53 7.76003L9.3 8.70003C9.3 8.70003 9.94 8.85003 9.94 8.86003C10.29 8.95003 10.35 9.18003 10.35 9.37003L9.36 13.32L9.37 13.34Z"
        fill={color}
        transform="translate(-5.5 -5.5) scale(2.0625)"
      />
      <svg x="18" y="18" width="33" height="33" viewBox={GRID_VIEW_BOX}>
        {HEATMAP_CELLS.map((cell) => (
          <rect
            key={cell.id}
            x={cell.x}
            y={cell.y}
            width={CELL_SIZE}
            height={CELL_SIZE}
            fill={cell.fill}
            stroke={CELL_STROKE_COLOR}
            strokeWidth={CELL_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </svg>
  );
};

export default memo(HeatmapIcon);
