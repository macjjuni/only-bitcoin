/**
 * 캔버스에 그리는 비트코인 코인 아이콘.
 *
 * 헤더의 `<KIcon icon="bitcoin" />` 과 **같은 패스**다. 같은 서비스 안에서
 * 비트코인 마크가 자리마다 다르게 생기면 안 된다.
 *
 * 전에는 세 곳이 각자 그렸다 — 워드마크 베이크는 이 패스를 복사해 뒀고,
 * 전광판과 블록 현황판은 **시스템 폰트의 `B` 를 회전시켜** 흉내 냈다. 글꼴이
 * 깔린 것에 따라(Pretendard·Apple SD Gothic·system-ui) 모양이 기기마다
 * 달라졌고 진짜 ₿ 의 비율과도 맞지 않았다.
 */

/** kku-ui `bitcoin` 아이콘 패스. 바깥 원 안에 ₿ 가 **구멍으로** 뚫려 있다. */
export const BITCOIN_ICON_PATH =
  "M33.2538 16.1292C33.2538 25.0371 26.0329 32.2584 17.1255 32.2584C8.21799 32.2584 0.99707 25.0371 0.99707 16.1292C0.99707 7.22128 8.21799 0 17.1255 0C26.0329 0 33.2538 7.22128 33.2538 16.1292ZM21.0002 10.1366C23.2438 10.9071 24.8849 12.0607 24.5629 14.2077C24.3291 15.7799 23.4543 16.5403 22.2921 16.8065C23.8866 17.6335 24.4301 19.2029 23.9251 21.1005C22.9664 23.8314 20.6874 24.0613 17.6562 23.4905L16.9202 26.4261L15.1434 25.9844L15.8693 23.0882C15.4087 22.9742 14.9379 22.8522 14.4529 22.7221L13.724 25.6325L11.9492 25.1908L12.6842 22.2491L9.10534 21.3496L9.98817 19.3226C9.98817 19.3226 11.2982 19.6685 11.28 19.6433C11.7832 19.7673 12.0069 19.4406 12.095 19.2238L14.0895 11.256C14.1117 10.8798 13.9811 10.4059 13.2613 10.2264C13.2886 10.2072 11.9705 9.90669 11.9705 9.90669L12.4433 8.01585L16.0272 8.90026L16.7562 5.99188L18.532 6.43358L17.8182 9.28448C18.2961 9.39238 18.776 9.5023 19.2427 9.61828L19.9514 6.78553L21.7282 7.22724L21.0002 10.1366ZM16.7488 14.9882C17.9591 15.3091 20.5928 16.0074 21.0519 14.1765C21.5202 12.3033 18.9615 11.7376 17.7087 11.4606L17.7086 11.4606L17.7085 11.4606C17.5666 11.4292 17.4414 11.4015 17.3393 11.3761L16.4545 14.9117C16.5388 14.9325 16.6378 14.9588 16.7488 14.9882ZM15.3775 20.6807C16.8271 21.0626 19.9976 21.8977 20.5021 19.8803C21.0185 17.8175 17.9445 17.1305 16.4446 16.7952L16.4441 16.7951C16.2767 16.7577 16.129 16.7247 16.008 16.6946L15.032 20.5913C15.1311 20.6158 15.2472 20.6464 15.3771 20.6806L15.3775 20.6807Z";

/** 패스 원의 중심·반지름(viewBox 좌표). 원을 원하는 크기에 맞추는 데 쓴다. */
export const BITCOIN_ICON_CENTER_X = 17.1255;
export const BITCOIN_ICON_CENTER_Y = 16.1292;
export const BITCOIN_ICON_RADIUS = 16.1292;

let cachedIconPath: Path2D | null = null;

/**
 * 패스를 한 번만 만들어 재사용한다.
 *
 * `Path2D` 는 브라우저 전역이라 Node 에서 도는 테스트에는 없다. 모듈
 * 최상단에서 만들면 이 파일을 import 하는 것만으로 테스트가 터진다.
 */
const resolveBitcoinIconPath = (): Path2D | null => {
  if (typeof Path2D === "undefined") {
    return null;
  }

  cachedIconPath ??= new Path2D(BITCOIN_ICON_PATH);

  return cachedIconPath;
};

/**
 * 코인 아이콘을 그린다.
 *
 * **글자 색 원을 깔고 그 위에 코인 패스를 채운다.** 패스에 ₿ 가 구멍으로
 * 뚫려 있어서, 아래에 깔린 색이 그대로 글자가 된다. 글자를 따로 그릴 필요가
 * 없고 구멍 모양이 헤더 아이콘과 정확히 같다.
 */
export const drawBitcoinCoin = (
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  coinColor: string,
  glyphColor: string,
): void => {
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fillStyle = glyphColor;
  context.fill();

  const iconPath = resolveBitcoinIconPath();

  if (!iconPath) {
    // `Path2D` 가 없는 환경. 글자 없는 코인이라도 자리는 맞춰 둔다.
    context.fillStyle = coinColor;
    context.fill();
    return;
  }

  context.save();
  context.translate(centerX, centerY);

  const scale = radius / BITCOIN_ICON_RADIUS;

  context.scale(scale, scale);
  context.translate(-BITCOIN_ICON_CENTER_X, -BITCOIN_ICON_CENTER_Y);
  context.fillStyle = coinColor;
  // ₿ 가 구멍으로 뚫린 모양이라 `evenodd` 가 필수다. 기본값(nonzero)으로
  // 채우면 구멍이 메워져 주황 원만 남는다.
  context.fill(iconPath, "evenodd");
  context.restore();
};
