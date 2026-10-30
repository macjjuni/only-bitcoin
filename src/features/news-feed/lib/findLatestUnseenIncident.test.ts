import { describe, expect, it } from "vitest";
import type { IncidentEvent } from "@/entities/incident";
import { findLatestUnseenIncident } from "./findLatestUnseenIncident";

const createIncident = (id: string, date: string): IncidentEvent => ({
  id,
  date,
  name: id,
  country: "글로벌",
  type: "hack",
  summary: id,
  amountText: "",
  article: "",
});

const incidents = [
  createIncident("2019-05-binance", "2019-05"),
  createIncident("2026-09-bitget", "2026-09"),
  createIncident("2026-10-prabang", "2026-10"),
  createIncident("2026-10-binance", "2026-10"),
];

describe("findLatestUnseenIncident", () => {
  it("확인한 적이 없으면 가장 최근 사건을 고른다", () => {
    expect(findLatestUnseenIncident(incidents, [])?.id).toBe("2026-10-binance");
  });

  it("최근 사건을 확인했으면 그다음 미확인 사건을 고른다", () => {
    expect(findLatestUnseenIncident(incidents, ["2026-10-binance"])?.id).toBe("2026-10-prabang");
  });

  it("전부 확인했으면 null", () => {
    expect(
      findLatestUnseenIncident(
        incidents,
        incidents.map((incident) => incident.id),
      ),
    ).toBeNull();
  });
});
