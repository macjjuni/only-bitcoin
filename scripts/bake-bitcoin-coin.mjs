/**
 * 세일러문 무기 비트코인 동전 텍스처를 구움.
 *
 * 도지코인( `bake-doge-coin.mjs` )과 달리 입력 이미지가 없음. 비트코인 로고 에셋이
 * 저장소에 없고 ₿ 글리프를 가진 폰트도 못 믿어서, 획을 SVG 패스로 직접 그림.
 * 텍스처 맨 위 가운데(테두리 색)는 동전 옆면 색으로도 씀(`weaponModel.ts`).
 *
 * 실행: `node scripts/bake-bitcoin-coin.mjs`
 */
import { createRequire } from "node:module";

// sharp 는 직접 의존성이 아니라 next 가 가진 것을 빌려 씀.
const requireFromNext = createRequire(createRequire(import.meta.url).resolve("next/package.json"));
const sharp = requireFromNext("sharp");

const SIZE = 512;
const FACE_RADIUS = 214;
const OUTPUT = "public/models/bitcoin-coin.webp";

const center = SIZE / 2;

/**
 * ₿ 획. 0~100 칸에 그린 뒤 동전 앞면 크기로 늘림.
 *
 * 기둥 하나에 위아래 획 두 벌, 그 사이로 삐져 나온 세로 획 넷임. 채우기 대신
 * 굵은 선으로 그려 획 두께를 한 값으로 맞춤.
 */
const GLYPH_SVG = `<g fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="butt">
  <path d="M30 16 V88"/>
  <path d="M30 22 H56 a15 15 0 0 1 0 30 H30"/>
  <path d="M30 52 H60 a15 15 0 0 1 0 30 H30"/>
  <path d="M44 4 V16"/>
  <path d="M62 4 V16"/>
  <path d="M44 88 V100"/>
  <path d="M62 88 V100"/>
</g>`;

const faceSize = FACE_RADIUS * 2;
const glyphScale = faceSize / 118;
// 글리프 칸(104 x 104)을 앞면 가운데에 둠. 기둥이 왼쪽에 쏠려 있어 x 를 조금 밀어 맞춤.
const glyphX = center - faceSize / 2 + 8 * glyphScale;
const glyphY = center - faceSize / 2 + 7 * glyphScale;

const coinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
  <defs>
    <radialGradient id="orange" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#ffb04a"/>
      <stop offset="1" stop-color="#e07c0c"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="#9a560a"/>
  <circle cx="${center}" cy="${center}" r="${center}" fill="#b8690c"/>
  <circle cx="${center}" cy="${center}" r="${center - 18}" fill="#f0921c"/>
  <circle cx="${center}" cy="${center}" r="${FACE_RADIUS + 6}" fill="#a85f0a"/>
  <circle cx="${center}" cy="${center}" r="${FACE_RADIUS}" fill="url(#orange)"/>
  <g transform="translate(${glyphX} ${glyphY}) scale(${glyphScale})">${GLYPH_SVG}</g>
</svg>`;

const info = await sharp(Buffer.from(coinSvg)).webp({ quality: 90 }).toFile(OUTPUT);
console.log(`[bitcoin-coin] ${OUTPUT} ${info.width}x${info.height} ${info.size}B`);

// 눈으로 확인하기 쉽게 PNG 도 임시로 떨굼. 저장소에는 webp 만 들어감.
if (process.argv.includes("--preview")) {
  const previewPath = process.argv[process.argv.indexOf("--preview") + 1];
  await sharp(Buffer.from(coinSvg)).png().toFile(previewPath);
  console.log(`[bitcoin-coin] 미리보기 ${previewPath}`);
}
