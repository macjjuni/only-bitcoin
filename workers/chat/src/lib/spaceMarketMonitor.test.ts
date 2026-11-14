import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SpaceServerFrame } from "../../../../src/entities/space/model/spaceProtocol";
import { MarketFeedError } from "./spaceMarketFeed";
import { SpaceMarketMonitor } from "./spaceMarketMonitor";

const createHarness = () => {
  const values = new Map<string, unknown>();
  let alarmAt: number | null = null;
  const storage = {
    get: vi.fn(async (key: string) => structuredClone(values.get(key))),
    put: vi.fn(async (key: string, value: unknown) => {
      values.set(key, structuredClone(value));
    }),
    getAlarm: vi.fn(async () => alarmAt),
    setAlarm: vi.fn(async (at: number) => {
      alarmAt = at;
    }),
    deleteAlarm: vi.fn(async () => {
      alarmAt = null;
    }),
  };
  const room = { occupied: true, price: 100 };
  const frames: SpaceServerFrame[] = [];
  const feed = vi.fn(async () => ({ price: room.price, referencePrice: 100, atMs: Date.now() }));
  const construct = () =>
    new SpaceMarketMonitor(
      storage as unknown as DurableObjectStorage,
      () => room.occupied,
      (frame) => frames.push(frame),
      feed,
    );
  return { room, frames, feed, storage, construct, monitor: construct() };
};

describe("공간 공통 시세와 연출", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-11T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("빈 방에서는 조회하지 않고 여러 입장에도 알람 하나만 예약한다", async () => {
    const { monitor, room, storage, feed } = createHarness();
    room.occupied = false;
    await monitor.start();
    await monitor.poll();
    expect(feed).not.toHaveBeenCalled();
    expect(storage.setAlarm).not.toHaveBeenCalled();
    room.occupied = true;
    await Promise.all([monitor.start(), monitor.start()]);
    expect(storage.setAlarm).toHaveBeenCalledTimes(1);
    room.occupied = false;
    await monitor.stopIfEmpty();
    expect(await storage.getAlarm()).toBeNull();
  });

  it("상승 때만 폭죽 이벤트를 만들고 재시작·알람 재시도에 중복 발동하지 않는다", async () => {
    const { monitor, room, frames, feed, construct } = createHarness();
    room.price = 101;
    await monitor.poll();
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({
      t: "market",
      state: {
        track: "surge",
        direction: "rise",
        startsAt: Date.now() + 700,
        celebration: { startsAt: Date.now() + 700 },
      },
    });
    const resumed = construct();
    await resumed.poll();
    expect(feed).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10000);
    await resumed.poll();
    expect(frames).toHaveLength(1);
    const state = await resumed.start();
    expect(state.celebration?.id).toBe(
      (frames[0] as Extract<SpaceServerFrame, { t: "market" }>).state.celebration?.id,
    );
  });

  it("하락은 음악만 전환한다", async () => {
    const { monitor, room, frames } = createHarness();
    room.price = 99;
    await monitor.poll();
    expect(frames[0]).toMatchObject({
      t: "market",
      state: { track: "surge", direction: "fall", celebration: null },
    });
  });

  it("하락 중 상승으로 뒤집히면 곡은 그대로 두고 폭죽만 한 번 쏜다", async () => {
    const { monitor, room, frames } = createHarness();
    room.price = 99;
    await monitor.poll();
    const entered = (frames[0] as Extract<SpaceServerFrame, { t: "market" }>).state;
    room.price = 101;
    vi.advanceTimersByTime(10000);
    await monitor.poll();
    expect(frames).toHaveLength(2);
    expect(frames[1]).toMatchObject({
      t: "market",
      state: {
        track: "surge",
        direction: "rise",
        startsAt: entered.startsAt,
        celebration: { startsAt: Date.now() + 700 },
      },
    });
    // 같은 방향이 이어지는 동안에는 다시 쏘지 않음.
    vi.advanceTimersByTime(10000);
    await monitor.poll();
    expect(frames).toHaveLength(2);
    // 다시 하락으로 뒤집히면 방향만 바꾸고 폭죽은 없음.
    room.price = 99;
    vi.advanceTimersByTime(10000);
    await monitor.poll();
    expect(frames[2]).toMatchObject({
      t: "market",
      state: { track: "surge", direction: "fall", startsAt: entered.startsAt, celebration: null },
    });
  });

  it("안정되면 기본 음악으로 복귀하고 10분 동안 다시 발동하지 않는다", async () => {
    const { monitor, room, frames } = createHarness();
    room.price = 101;
    await monitor.poll();
    room.price = 100;
    for (let index = 0; index < 32; index += 1) {
      vi.advanceTimersByTime(10000);
      await monitor.poll();
    }
    expect((await monitor.start()).track).toBe("base");
    room.price = 101;
    vi.advanceTimersByTime(10000);
    await monitor.poll();
    expect((await monitor.start()).track).toBe("base");
    // 폭죽이 실린 프레임은 처음 올랐을 때 하나뿐임. 쿨다운 중의 재상승은 발동하지 않음.
    expect(
      frames.filter((frame) => frame.t === "market" && frame.state.celebration !== null),
    ).toHaveLength(1);
  });

  it("빈 방에 남은 급등 상태는 다음 입장자에게 기본 음악으로 돌려준다", async () => {
    const { monitor, room, frames } = createHarness();
    room.price = 101;
    await monitor.poll();
    room.occupied = false;
    await monitor.stopIfEmpty();
    vi.advanceTimersByTime(3_600_000);
    room.occupied = true;
    const state = await monitor.start();
    expect(state).toMatchObject({ track: "base", direction: null, celebration: null });
    expect(state.revision).toBeGreaterThan(
      (frames[0] as Extract<SpaceServerFrame, { t: "market" }>).state.revision,
    );
    // 잠깐 비었다 돌아온 경우에는 진행 중인 급등을 유지한다.
    room.price = 101;
    await monitor.poll();
    room.occupied = false;
    await monitor.stopIfEmpty();
    vi.advanceTimersByTime(30_000);
    room.occupied = true;
    expect((await monitor.start()).track).toBe("surge");
  });

  it("조회 실패는 상승 종료로 취급하지 않고 429 재시도 간격을 지킨다", async () => {
    const { monitor, room, feed, frames, storage } = createHarness();
    room.price = 101;
    await monitor.poll();
    vi.advanceTimersByTime(180000);
    feed.mockRejectedValueOnce(new MarketFeedError(60000));
    await monitor.poll();
    expect((await monitor.start()).track).toBe("surge");
    expect(await storage.getAlarm()).toBe(Date.now() + 60000);
    expect(frames).toHaveLength(1);
  });

  it("방 전체 테스트 쿨다운은 사용자·재시작에 관계없이 유지된다", async () => {
    const { monitor, construct, frames } = createHarness();
    expect(await monitor.testCelebration(1)).toBe(true);
    expect(await monitor.testCelebration(2)).toBe(false);
    expect(await construct().testCelebration(3)).toBe(false);
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ t: "celebrate", event: { testSeat: 1 } });
    vi.advanceTimersByTime(30000);
    expect(await monitor.testCelebration(2)).toBe(true);
  });
});
