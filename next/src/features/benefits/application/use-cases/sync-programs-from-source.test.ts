import { describe, expect, it, vi } from "vitest";
import type { ProgramSourcePort } from "../ports/program-source";
import type { ProgramRepository } from "../ports/program-repository";
import type { SyncRunRepository } from "../ports/sync-run-repository";
import { SyncProgramsFromSource } from "./sync-programs-from-source";

const clock = { now: () => new Date("2026-10-12T03:00:00Z") };
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe("SyncProgramsFromSource", () => {
  it('소스 unavailable 이면 status: "skipped"', async () => {
    const source: ProgramSourcePort = {
      id: "ontong",
      label: "온통청년",
      checkAvailability: () => ({ available: false, reason: "키 없음" }),
      fetchPrograms: async () => [],
    };
    const programs: ProgramRepository = {
      search: async () => ({ items: [], total: 0 }),
      findById: async () => null,
      findExistingFor: async () => [],
      upsertMany: async () => ({ inserted: 0, updated: 0 }),
    };
    const syncRuns: SyncRunRepository = {
      start: async () => 1,
      finish: async () => {},
      lastSuccessAt: async () => null,
      latestPerSource: async () => [],
      listRecent: async () => [],
    };
    const uc = new SyncProgramsFromSource([source], programs, syncRuns, clock, logger);
    const results = await uc.execute();
    expect(results[0]?.status).toBe("skipped");
  });
});
