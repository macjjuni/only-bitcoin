export interface TreemapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// region [Privates]
/** 한 줄에 담긴 칸 중 가장 찌그러진 칸의 가로세로비. 1 에 가까울수록 정사각형. */
const calculateWorstAspectRatio = (rowAreas: number[], sideLength: number): number => {
  const rowArea = rowAreas.reduce((sum, area) => sum + area, 0);
  const maxArea = Math.max(...rowAreas);
  const minArea = Math.min(...rowAreas);
  const squaredSide = sideLength ** 2;
  const squaredRowArea = rowArea ** 2;

  return Math.max(
    (squaredSide * maxArea) / squaredRowArea,
    squaredRowArea / (squaredSide * minArea),
  );
};
// endregion

/**
 * Squarified treemap 배치( Bruls 외, 2000 ).
 *
 * 공유 카드는 DOM 을 그대로 캡처해서 차트 라이브러리 SVG 대신 div 로 직접 그림.
 * 큰 값부터 남은 영역의 짧은 변에 줄을 쌓고, 칸이 더 찌그러지기 시작하면 줄을 바꿈.
 * 결과는 입력 순서 그대로 돌려줌. 0 이하 값은 크기 0 칸이 됨.
 */
export const squarifyTreemap = (values: number[], width: number, height: number): TreemapRect[] => {
  const rects: TreemapRect[] = values.map(() => ({ x: 0, y: 0, width: 0, height: 0 }));
  const totalValue = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (totalValue <= 0 || width <= 0 || height <= 0) {
    return rects;
  }

  const areaScale = (width * height) / totalValue;
  const sortedItems = values
    .map((value, index) => ({ index, area: Math.max(0, value) * areaScale }))
    .filter((item) => item.area > 0)
    .sort((a, b) => b.area - a.area);

  const remaining = { x: 0, y: 0, width, height };
  let row: typeof sortedItems = [];

  /** 모아 둔 줄을 남은 영역의 짧은 변에 붙여 확정하고 남은 영역을 줄임. */
  const layoutRow = () => {
    const rowArea = row.reduce((sum, item) => sum + item.area, 0);
    const isStackedVertically = remaining.width >= remaining.height;
    const thickness = rowArea / (isStackedVertically ? remaining.height : remaining.width);
    let offset = 0;

    for (const item of row) {
      const length = item.area / thickness;
      rects[item.index] = isStackedVertically
        ? { x: remaining.x, y: remaining.y + offset, width: thickness, height: length }
        : { x: remaining.x + offset, y: remaining.y, width: length, height: thickness };
      offset += length;
    }

    if (isStackedVertically) {
      remaining.x += thickness;
      remaining.width -= thickness;
    } else {
      remaining.y += thickness;
      remaining.height -= thickness;
    }
    row = [];
  };

  for (const item of sortedItems) {
    const sideLength = Math.min(remaining.width, remaining.height);
    const rowAreas = row.map((rowItem) => rowItem.area);
    const shouldStartNewRow =
      row.length > 0 &&
      calculateWorstAspectRatio([...rowAreas, item.area], sideLength) >
        calculateWorstAspectRatio(rowAreas, sideLength);

    if (shouldStartNewRow) {
      layoutRow();
    }
    row.push(item);
  }
  layoutRow();

  return rects;
};
