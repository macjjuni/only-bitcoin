import {
  appendPriceSample,
  createSurgeState,
  readCandleChangePercent,
  SPACE_BGM_SURGE,
  type SurgeState,
  stepSurgeState,
} from "../../../../src/entities/space/lib/marketSurge";
import {
  SPACE_MARKET,
  type SpaceCelebration,
  type SpaceMarketState,
} from "../../../../src/entities/space/model/spaceMarket";
import {
  SPACE_PROTOCOL_VERSION,
  type SpaceServerFrame,
} from "../../../../src/entities/space/model/spaceProtocol";
import { fetchSpaceMarketSample, MarketFeedError, type SpaceMarketSample } from "./spaceMarketFeed";

interface PersistedMarket {
  state: SpaceMarketState;
  surge: SurgeState;
  nextPollAt: number;
  lastTestAt: number;
}

type MarketStorage = Pick<
  DurableObjectStorage,
  "get" | "put" | "getAlarm" | "setAlarm" | "deleteAlarm"
>;
const STORAGE_KEY = "space-market-v1";

/** 가격 판정과 테스트 요청을 직렬화하여 재접속·알람 재시도에도 한 이벤트만 만든다. */
export class SpaceMarketMonitor {
  private saved: PersistedMarket | null = null;
  private pending: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly storage: MarketStorage,
    private readonly hasOccupants: () => boolean,
    private readonly broadcast: (frame: SpaceServerFrame) => void,
    private readonly readSample: () => Promise<SpaceMarketSample> = fetchSpaceMarketSample,
  ) {}

  private enqueue<Result>(operation: () => Promise<Result>): Promise<Result> {
    const result = this.pending.then(operation);
    this.pending = result.catch(() => undefined);
    return result;
  }

  private async load(): Promise<PersistedMarket> {
    if (!this.saved) {
      this.saved = (await this.storage.get<PersistedMarket>(STORAGE_KEY)) ?? {
        state: {
          revision: 0,
          track: "base",
          direction: null,
          startsAt: Date.now(),
          prefetch: false,
          celebration: null,
        },
        surge: createSurgeState(),
        nextPollAt: 0,
        lastTestAt: 0,
      };
    }
    return this.saved;
  }

  private createCelebration(): SpaceCelebration {
    return {
      id: crypto.randomUUID(),
      startsAt: Date.now() + SPACE_MARKET.eventLeadMs,
      seed: crypto.getRandomValues(new Uint32Array(1))[0],
    };
  }

  start(): Promise<SpaceMarketState> {
    return this.enqueue(async () => {
      let saved = await this.load();
      if (this.hasOccupants() && (await this.storage.getAlarm()) === null) {
        const now = Date.now();
        const isStale = now - saved.nextPollAt > SPACE_BGM_SURGE.stalePriceMs;
        // 방이 빈 동안 멈춘 급등 판정을 다음 입장자에게 그대로 들려주지 않는다.
        if (isStale && (saved.state.track !== "base" || saved.state.prefetch)) {
          const state: SpaceMarketState = {
            revision: saved.state.revision + 1,
            track: "base",
            direction: null,
            startsAt: now,
            prefetch: false,
            celebration: null,
          };
          saved = { ...saved, state, surge: createSurgeState() };
          await this.storage.put(STORAGE_KEY, saved);
          this.saved = saved;
          this.broadcast({ v: SPACE_PROTOCOL_VERSION, t: "market", state, serverAt: now });
        }
        await this.storage.setAlarm(Math.max(now + 1, saved.nextPollAt));
      }
      return saved.state;
    });
  }

  stopIfEmpty(): Promise<void> {
    return this.enqueue(async () => {
      if (!this.hasOccupants()) {
        await this.storage.deleteAlarm();
      }
    });
  }

  testCelebration(seat: number): Promise<boolean> {
    return this.enqueue(async () => {
      const saved = await this.load();
      const now = Date.now();
      if (!this.hasOccupants() || now - saved.lastTestAt < SPACE_MARKET.testCooldownMs) {
        return false;
      }
      const next = { ...saved, lastTestAt: now };
      await this.storage.put(STORAGE_KEY, next);
      this.saved = next;
      this.broadcast({
        v: SPACE_PROTOCOL_VERSION,
        t: "celebrate",
        event: { ...this.createCelebration(), testSeat: seat },
        serverAt: Date.now(),
      });
      return true;
    });
  }

  poll(): Promise<void> {
    return this.enqueue(async () => {
      const saved = await this.load();
      if (!this.hasOccupants()) {
        await this.storage.deleteAlarm();
        return;
      }
      if (Date.now() < saved.nextPollAt) {
        await this.storage.setAlarm(saved.nextPollAt);
        return;
      }

      let sample: SpaceMarketSample;
      try {
        sample = await this.readSample();
      } catch (error) {
        // 조회 실패를 가격 안정으로 해석하지 않고 현재 음악과 판정을 유지한다.
        const next = {
          ...saved,
          nextPollAt: Date.now() + (error instanceof MarketFeedError ? error.retryAfterMs : 20_000),
        };
        await this.storage.put(STORAGE_KEY, next);
        this.saved = next;
        if (this.hasOccupants()) {
          await this.storage.setAlarm(next.nextPollAt);
        } else {
          await this.storage.deleteAlarm();
        }
        return;
      }
      if (!this.hasOccupants()) {
        await this.storage.deleteAlarm();
        return;
      }

      const sampled = appendPriceSample(saved.surge, sample.price, sample.atMs);
      const surge = stepSurgeState(sampled, sample.referencePrice, sample.atMs);
      const change = readCandleChangePercent(sampled, sample.referencePrice, sample.atMs);
      let state = saved.state;
      const prefetch = change !== null && Math.abs(change) >= SPACE_BGM_SURGE.prefetchPercent;
      // 급등락 중 반대쪽으로 진입 기준을 넘으면 방향이 뒤집힌 것으로 봄.
      const liveDirection =
        surge.isSurging && change !== null && Math.abs(change) >= SPACE_BGM_SURGE.enterPercent
          ? change > 0
            ? "rise"
            : "fall"
          : null;
      if (surge.isSurging !== saved.surge.isSurging) {
        const isRising = surge.isSurging && change !== null && change > 0;
        const celebration = isRising ? this.createCelebration() : null;
        state = {
          revision: state.revision + 1,
          track: surge.isSurging ? "surge" : "base",
          direction: surge.isSurging ? (isRising ? "rise" : "fall") : null,
          startsAt: celebration?.startsAt ?? Date.now() + SPACE_MARKET.eventLeadMs,
          prefetch,
          celebration,
        };
      } else if (liveDirection && liveDirection !== state.direction) {
        // 곡은 이어 틀어야 해서 startsAt 은 그대로 둠. 상승으로 뒤집힐 때만 폭죽을 쏨.
        state = {
          ...state,
          revision: state.revision + 1,
          direction: liveDirection,
          prefetch,
          celebration: liveDirection === "rise" ? this.createCelebration() : null,
        };
      } else if (prefetch !== state.prefetch) {
        state = { ...state, revision: state.revision + 1, prefetch };
      }
      const next = { ...saved, state, surge, nextPollAt: Date.now() + SPACE_MARKET.pollIntervalMs };
      // 먼저 저장해야 재시작 후 같은 상승을 다시 발동하지 않는다.
      await this.storage.put(STORAGE_KEY, next);
      this.saved = next;
      await this.storage.setAlarm(next.nextPollAt);
      if (state !== saved.state) {
        this.broadcast({ v: SPACE_PROTOCOL_VERSION, t: "market", state, serverAt: Date.now() });
      }
    });
  }
}
