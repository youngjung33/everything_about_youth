import { describe, expect, it, vi } from "vitest";
import type { SchemeSourcePort } from "@/features/finance/application/ports/scheme-source";
import type { SchemeRepository } from "@/features/finance/application/ports/scheme-repository";
import type { SyncRunRepository } from "@/features/finance/application/ports/sync-run-repository";
import { SourceSkippedError } from "@/features/finance/application/ports/scheme-source";
import { SyncSchemesFromSource } from "@/features/finance/application/use-cases/sync-schemes-from-source";

const clock = { now: () => new Date("2026-10-12T03:00:00Z") };
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function emptyRepo(): SchemeRepository {
  return {
    search: async () => ({ items: [], total: 0 }),
    findById: async () => null,
    findExistingFor: async () => [],
    upsertMany: async () => ({ inserted: 0, updated: 0 }),
  };
}

function emptyRuns(): SyncRunRepository {
  return {
    start: async () => 1,
    finish: async () => {},
    lastSuccessAt: async () => null,
    latestPerSource: async () => [],
    listRecent: async () => [],
  };
}

describe("SyncSchemesFromSource", () => {
  it('소스 unavailable 이면 status: "skipped"', async () => {
    const source: SchemeSourcePort = {
      id: "curated",
      label: "큐레이션",
      checkAvailability: () => ({ available: false, reason: "키 없음" }),
      fetchSchemes: async () => [],
    };
    const uc = new SyncSchemesFromSource([source], emptyRepo(), emptyRuns(), clock, logger);
    const results = await uc.execute();
    expect(results[0]?.status).toBe("skipped");
  });

  it("fetch 가 throw 하면 status: failed", async () => {
    const source: SchemeSourcePort = {
      id: "curated",
      label: "큐레이션",
      checkAvailability: () => ({ available: true }),
      fetchSchemes: async () => {
        throw new Error("network down");
      },
    };
    const uc = new SyncSchemesFromSource([source], emptyRepo(), emptyRuns(), clock, logger);
    const results = await uc.execute();
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.error).toContain("network");
  });

  it("SourceSkippedError 이면 skipped", async () => {
    const source: SchemeSourcePort = {
      id: "ontong-finance",
      label: "온통",
      checkAvailability: () => ({ available: true }),
      fetchSchemes: async () => {
        throw new SourceSkippedError("빈 페이지");
      },
    };
    const uc = new SyncSchemesFromSource([source], emptyRepo(), emptyRuns(), clock, logger);
    const results = await uc.execute();
    expect(results[0]?.status).toBe("skipped");
  });

  it("정상 수집이면 success", async () => {
    const source: SchemeSourcePort = {
      id: "curated",
      label: "큐레이션",
      checkAvailability: () => ({ available: true }),
      fetchSchemes: async () => [],
    };
    const uc = new SyncSchemesFromSource([source], emptyRepo(), emptyRuns(), clock, logger);
    const results = await uc.execute();
    expect(results[0]?.status).toBe("success");
  });
});
