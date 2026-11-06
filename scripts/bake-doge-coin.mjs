/**
 * 머슼크 무기 도지코인 동전 텍스처를 구움.
 *
 * 입력 `assets/doge.svg`(시바 로고, 경로 1만 개·1.8MB)는 그대로 내려보내기엔 무거워서
 * 금색 동전 바탕·테두리 안에 얼굴을 넣은 512px webp 한 장으로 구움.
 * 텍스처 맨 위 가운데(테두리 색)는 동전 옆면 색으로도 씀(`weaponModel.ts`).
 *
 * 실행: `node scripts/bake-doge-coin.mjs`
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

// sharp 는 직접 의존성이 아니라 next 가 가진 것을 빌려 씀.
const requireFromNext = createRequire(createRequire(import.meta.url).resolve("next/package.json"));
const sharp = requireFromNext("sharp");

const SIZE = 512;
const FACE_RADIUS = 214;
const OUTPUT = "public/models/doge-coin.webp";

const rawSvg = readFileSync("assets/doge.svg", "utf8");
// 파일 앞에 붙은 잡문자를 떼고 `<svg` 부터 읽음.
const logoSvg = rawSvg.slice(rawSvg.indexOf("<svg"));

const faceSize = FACE_RADIUS * 2;
const face = await sharp(Buffer.from(logoSvg), { density: 1200 })
  .resize(faceSize, faceSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const center = SIZE / 2;
const coinSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${SIZE}" height="${SIZE}">
  <defs>
    <clipPath id="face"><circle cx="${center}" cy="${center}" r="${FACE_RADIUS}"/></clipPath>
    <radialGradient id="gold" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#f3d77a"/>
      <stop offset="1" stop-color="#cfa53a"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="#9c7a1e"/>
  <circle cx="${center}" cy="${center}" r="${center}" fill="#b8902a"/>
  <circle cx="${center}" cy="${center}" r="${center - 18}" fill="#e2bd52"/>
  <circle cx="${center}" cy="${center}" r="${FACE_RADIUS + 6}" fill="#a8861f"/>
  <circle cx="${center}" cy="${center}" r="${FACE_RADIUS}" fill="url(#gold)"/>
  <image x="${center - FACE_RADIUS}" y="${center - FACE_RADIUS + 14}" width="${faceSize}" height="${faceSize}"
    clip-path="url(#face)" xlink:href="data:image/png;base64,${face.toString("base64")}"/>
</svg>`;

const info = await sharp(Buffer.from(coinSvg)).webp({ quality: 90 }).toFile(OUTPUT);
console.log(`[doge-coin] ${OUTPUT} ${info.width}x${info.height} ${info.size}B`);
