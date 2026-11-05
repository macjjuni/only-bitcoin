import { describe, expect, it } from "vitest";
import {
  createTickerSignature,
  formatMarketCapUsd,
  resolveFearGreedTone,
  resolveFearGreedZone,
  resolveTickerItems,
  TICKER_PLACEHOLDER,
  TICKER_TEXTURE,
  type TickerState,
} from "@/views/space/lib/tickerTexture";

const createState = (overrides: Partial<TickerState> = {}): TickerState => ({
  dominance: 58.42,
  marketCapUsd: 1_600_054_222_692,
  premium: 0.42,
  exRate: 1_344.9,
  fearGreed: 72,
  ...overrides,
});

describe("resolveTickerItems", () => {
  it("한 바퀴를 칸 수만큼 채운다", () => {
    expect(resolveTickerItems(createState())).toHaveLength(TICKER_TEXTURE.slotCount);
  });

  it("지표를 전광판 표기로 줄여 적는다", () => {
    const items = resolveTickerItems(createState());

    expect(items.map((item) => `${item.label} ${item.valueText}`)).toEqual([
      "도미넌스 58.4%",
      "시가총액 $1.60T",
      "김프 +0.42%",
      "USD/KRW 1,345",
      "공포·탐욕 72",
    ]);
  });

  it("김프 부호에 따라 색을 가른다", () => {
    expect(resolveTickerItems(createState({ premium: 1.2 }))[2].tone).toBe("up");
    expect(resolveTickerItems(createState({ premium: -1.2 }))[2].tone).toBe("down");
    // 역프리미엄 ↔ 프리미엄 전환 구간. 0 도 실제 값이라 자리표시로 덮지 않는다.
    expect(resolveTickerItems(createState({ premium: 0 }))[2]).toMatchObject({
      valueText: "0.00%",
      tone: "flat",
    });
  });

  it("한글 구간 이름은 값이 아니라 꼬리말로 넘긴다", () => {
    // 숫자 글꼴에 한글 글리프가 없어 값에 섞으면 그 글자만 폴백으로 떨어진다.
    const items = resolveTickerItems(createState({ fearGreed: 20 }));

    expect(items[4]).toMatchObject({ valueText: "20", suffix: "극단적 공포", tone: "down" });
  });

  it("아직 못 받은 값만 자리표시로 둔다", () => {
    const items = resolveTickerItems(
      createState({
        dominance: null,
        marketCapUsd: null,
        premium: null,
        exRate: null,
        fearGreed: null,
      }),
    );

    expect(items.map((item) => item.valueText)).toEqual(
      Array(TICKER_TEXTURE.slotCount).fill(TICKER_PLACEHOLDER),
    );
  });
});

describe("formatMarketCapUsd", () => {
  it("조 단위는 소수 둘째 자리까지 줄여 쓴다", () => {
    expect(formatMarketCapUsd(1_600_054_222_692)).toBe("$1.60T");
    expect(formatMarketCapUsd(2_345_000_000_000)).toBe("$2.35T");
  });

  it("조에 못 미치면 십억 단위로 쓴다", () => {
    expect(formatMarketCapUsd(840_500_000_000)).toBe("$840.5B");
  });
});

describe("resolveFearGreedZone", () => {
  it("지수를 다섯 구간 이름으로 바꾼다", () => {
    expect(resolveFearGreedZone(10)).toBe("극단적 공포");
    expect(resolveFearGreedZone(30)).toBe("공포");
    expect(resolveFearGreedZone(50)).toBe("중립");
    expect(resolveFearGreedZone(70)).toBe("탐욕");
    expect(resolveFearGreedZone(90)).toBe("극단적 탐욕");
  });

  it("alternative.me 와 같은 경계로 나눈다", () => {
    expect(resolveFearGreedZone(24)).toBe("극단적 공포");
    expect(resolveFearGreedZone(25)).toBe("공포");
    expect(resolveFearGreedZone(46)).toBe("공포");
    expect(resolveFearGreedZone(47)).toBe("중립");
    expect(resolveFearGreedZone(54)).toBe("중립");
    expect(resolveFearGreedZone(55)).toBe("탐욕");
    expect(resolveFearGreedZone(74)).toBe("탐욕");
    expect(resolveFearGreedZone(75)).toBe("극단적 탐욕");
  });
});

describe("resolveFearGreedTone", () => {
  it("공포는 하락색, 탐욕은 상승색, 중립은 평색으로 둔다", () => {
    expect(resolveFearGreedTone(20)).toBe("down");
    expect(resolveFearGreedTone(46)).toBe("down");
    expect(resolveFearGreedTone(50)).toBe("flat");
    expect(resolveFearGreedTone(55)).toBe("up");
    expect(resolveFearGreedTone(80)).toBe("up");
  });
});

describe("createTickerSignature", () => {
  it("꼬리말만 바뀌어도 다시 굽는다", () => {
    // 54 와 56 은 둘 다 "공포·탐욕 5x" 라 숫자만 비교하면 중립↔탐욕 전환을 놓친다.
    const neutral = resolveTickerItems(createState({ fearGreed: 54 }));
    const greed = resolveTickerItems(createState({ fearGreed: 56 }));

    expect(createTickerSignature(neutral)).not.toBe(createTickerSignature(greed));
  });

  it("글자가 그대로면 같은 서명을 돌려준다", () => {
    const first = resolveTickerItems(createState());
    const almostSame = resolveTickerItems(createState({ dominance: 58.44 }));
    const changed = resolveTickerItems(createState({ dominance: 59.1 }));

    // 소수 한 자리까지만 찍으므로 58.42 와 58.44 는 같은 화면이다.
    expect(createTickerSignature(almostSame)).toBe(createTickerSignature(first));
    expect(createTickerSignature(changed)).not.toBe(createTickerSignature(first));
  });
});
