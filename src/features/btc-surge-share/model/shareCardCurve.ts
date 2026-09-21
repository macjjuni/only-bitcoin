/** 곡선이 뷰박스 상하단에 닿지 않도록 확보하는 여백 ( 위 · 아래 각각 ) */
const CURVE_VERTICAL_PADDING = 12;

export interface ShareCardCurve {
  /** 곡선 Path. 포인트가 부족하면 빈 문자열. */
  linePath: string;
  /** 곡선 아래를 채우는 영역 Path. 포인트가 부족하면 빈 문자열. */
  areaPath: string;
  /** 종점 좌표 ( 펄스 마커 위치 ) */
  lastX: number;
  lastY: number;
}

/**
 * 2개 이상의 포인트 배열에서 매끄러운 곡선 SVG Path 생성.
 *
 * 카드 레이아웃마다 뷰박스 크기가 다르므로 폭 · 높이를 인자로 받는다.
 */
export function generateSvgCurvePath(
  data: number[],
  width: number,
  height: number,
): ShareCardCurve {
  if (!data || data.length < 2) {
    return { linePath: "", areaPath: "", lastX: width, lastY: height / 2 };
  }

  const minPrice = Math.min(...data);
  const maxPrice = Math.max(...data);
  const priceRange = maxPrice - minPrice || 1;
  const plotHeight = height - CURVE_VERTICAL_PADDING * 2;

  const points = data.map((price, pointIndex) => {
    const x = (pointIndex / (data.length - 1)) * width;
    const y = height - ((price - minPrice) / priceRange) * plotHeight - CURVE_VERTICAL_PADDING;
    return { x, y };
  });

  let linePath = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex++) {
    const startPoint = points[pointIndex];
    const endPoint = points[pointIndex + 1];
    const controlPointX = ((startPoint.x + endPoint.x) / 2).toFixed(2);
    linePath += ` C ${controlPointX},${startPoint.y.toFixed(2)} ${controlPointX},${endPoint.y.toFixed(2)} ${endPoint.x.toFixed(2)},${endPoint.y.toFixed(2)}`;
  }

  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(2)},${height} L ${points[0].x.toFixed(2)},${height} Z`;

  return { linePath, areaPath, lastX: lastPoint.x, lastY: lastPoint.y };
}
