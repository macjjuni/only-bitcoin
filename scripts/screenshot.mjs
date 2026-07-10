/**
 * README 용 페이지 스크린샷 캡처기.
 *
 * 이미 떠 있는 dev 서버에 붙어서 찍는다. 프로덕션 빌드로 찍으면 AdSense/GA 가
 * 붙어 광고 자리가 생기므로(app/layout.tsx 의 isProduction 분기) 재현이 안 된다.
 *
 * 사용: pnpm dev 를 띄워둔 상태에서
 *   node scripts/screenshot.mjs            # 전체
 *   node scripts/screenshot.mjs overview   # 일부만
 *
 * 환경변수: BASE_URL(다른 주소에 붙기), SETTLE_MS, QUALITY, HEADED=1
 */
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "playwright";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "screenshot");
/** next dev 가 자기 pid/port 를 적어두는 곳. */
const DEV_LOCK = path.join(ROOT, ".next", "dev", "lock");

/** 지정하면 lock 파일 대신 이 주소를 쓴다. */
const EXTERNAL_URL = process.env.BASE_URL;

/** 차트 그리기와 react-countup 숫자 카운팅이 끝나기를 기다리는 시간. */
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 3000);
const QUALITY = Number(process.env.QUALITY ?? 80);
const HEADED = process.env.HEADED === "1";

/** 키가 곧 파일명(screenshot/<키>.jpg). 순서는 README 노출 순서를 따른다. */
const ROUTES = {
  overview: "/overview",
  blocks: "/blocks",
  btc2fiat: "/btc2fiat",
  premium: "/premium",
  "orange-pill": "/orange-pill",
  meme: "/orange-pill/meme",
  bip39: "/orange-pill/bip39",
  settings: "/settings",
};

/**
 * 390x844 CSS px * 1.5 = 585x1266 device px. 기존 스샷과 같은 규격이라
 * README 의 width=220 렌더링 결과가 흔들리지 않는다.
 */
const VIEWPORT = { width: 390, height: 844 };
const DEVICE_SCALE_FACTOR = 1.5;

const log = (msg) => process.stdout.write(`${msg}\n`);

const isReachable = async (url) => {
  try {
    await fetch(url, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
};

/**
 * 붙을 dev 서버의 주소.
 *
 * Next 16 은 한 디렉토리에 dev 서버를 하나만 허용하므로 여기서 새로 띄우지 않고,
 * 이미 떠 있는 서버가 lock 에 적어둔 주소를 그대로 빌려 쓴다.
 */
const resolveBaseUrl = async () => {
  if (EXTERNAL_URL) {
    if (await isReachable(EXTERNAL_URL)) return EXTERNAL_URL;
    throw new Error(`BASE_URL 에 응답이 없습니다: ${EXTERNAL_URL}`);
  }

  const lock = fs.existsSync(DEV_LOCK)
    ? JSON.parse(fs.readFileSync(DEV_LOCK, "utf8"))
    : null; /* 죽은 서버가 lock 을 두고 갔을 수 있으니 주소는 아래에서 확인한다. */

  if (lock?.appUrl && (await isReachable(lock.appUrl))) return lock.appUrl;

  throw new Error("dev 서버가 떠 있지 않습니다. 다른 터미널에서 `pnpm dev` 를 먼저 실행하세요.");
};

/**
 * 캡처 직전 화면을 정지 상태로 만든다.
 *
 * load 이벤트만으로는 부족하다. `useFadeInByPath` 가 SSR 시점엔 본문을 opacity-0
 * 으로 그리고, 하이드레이션이 끝난 뒤에야 opacity-100 으로 올린다. 라우트를 처음
 * 여는 동안에는 DOM 에 내용이 있어도 화면은 투명하다. 따라서 "본문이 실제로
 * 보이는가"(계산된 opacity)를 준비 완료 신호로 쓴다.
 */
const settle = async (page) => {
  await page.waitForFunction(
    () => {
      const main = document.querySelector("main.only-btc__content");
      if (!main || main.children.length === 0) return false;

      return Number(getComputedStyle(main).opacity) > 0.99;
    },
    null,
    { timeout: 120_000 },
  );

  await page
    .waitForFunction(() => Array.from(document.images).every((img) => img.complete), null, {
      timeout: 15_000,
    })
    .catch(() => log("  · 이미지 로딩 대기 시간 초과, 그대로 진행"));

  await page.evaluate(() => document.fonts.ready);
  await sleep(SETTLE_MS);
};

const capture = async (context, baseUrl, name, route) => {
  const page = await context.newPage();
  const file = path.join(OUT_DIR, `${name}.jpg`);

  try {
    // dev 서버는 첫 진입 시 라우트를 그때 컴파일하므로 넉넉히 기다린다.
    await page.goto(`${baseUrl}${route}`, { waitUntil: "load", timeout: 120_000 });
    await settle(page);

    await page.screenshot({
      path: file,
      type: "jpeg",
      quality: QUALITY,
      scale: "device", // CSS px 가 아닌 device px 로 저장 → 585x1266
      animations: "disabled",
    });

    const kb = Math.round(fs.statSync(file).size / 1024);
    log(`  ✓ ${name}.jpg (${kb} KB)`);
  } finally {
    await page.close();
  }
};

const main = async () => {
  const requested = process.argv.slice(2);
  const unknown = requested.filter((name) => !(name in ROUTES));

  if (unknown.length > 0) {
    throw new Error(
      `모르는 페이지: ${unknown.join(", ")}\n사용 가능: ${Object.keys(ROUTES).join(", ")}`,
    );
  }

  const targets = requested.length > 0 ? requested : Object.keys(ROUTES);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const baseUrl = await resolveBaseUrl();
  log(`▶ dev 서버: ${baseUrl}`);

  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    isMobile: true,
    hasTouch: true,
    // localStorage 가 빈 새 컨텍스트 → 앱 기본값(라이트 테마)으로 그려진다.
    colorScheme: "light",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  });

  try {
    for (const name of targets) {
      log(`▶ ${name} (${ROUTES[name]})`);
      await capture(context, baseUrl, name, ROUTES[name]);
    }
  } finally {
    await browser.close();
  }

  log(`\n완료: ${targets.length}장 → screenshot/`);
};

main().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});
