import { describe, expect, it, vi } from "vitest";
import type { JobPostingSourcePort } from "../ports/posting-source";
import type { JobPostingRepository } from "../ports/posting-repository";
import type { SyncRunRepository } from "../ports/sync-run-repository";
import { SourceSkippedError } from "../ports/posting-source";
import { SyncJobPostingsFromSource } from "./sync-job-postings-from-source";

const clock = { now: () => new Date("2026-10-12T03:00:00Z") };
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function emptyRepo(): JobPostingRepository {
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

describe("SyncJobPostingsFromSource", () => {
  it('소스 unavailable 이면 status: "skipped"', async () => {
    const source: JobPostingSourcePort = {
      id: "curated",
      label: "큐레이션",
      checkAvailability: () => ({ available: false, reason: "키 없음" }),
      fetchPostings: async () => [],
    };
    const uc = new SyncJobPostingsFromSource([source], emptyRepo(), emptyRuns(), clock, logger);
    const results = await uc.execute();
    expect(results[0]?.status).toBe("skipped");
  });

  it("fetch 가 throw 하면 status: failed", async () => {
    const source: JobPostingSourcePort = {
      id: "curated",
      label: "큐레이션",
      checkAvailability: () => ({ available: true }),
      fetchPostings: async () => {
        throw new Error("network down");
      },
    };
    const uc = new SyncJobPostingsFromSource([source], emptyRepo(), emptyRuns(), clock, logger);
    const results = await uc.execute();
    expect(results[0]?.status).toBe("failed");
    expect(results[0]?.error).toContain("network");
  });

  it("SourceSkippedError 이면 skipped", async () => {
    const source: JobPostingSourcePort = {
      id: "curated",
      label: "큐레이션",
      checkAvailability: () => ({ available: true }),
      fetchPostings: async () => {
        throw new SourceSkippedError("빈 페이지");
      },
    };
    const uc = new SyncJobPostingsFromSource([source], emptyRepo(), emptyRuns(), clock, logger);
    const results = await uc.execute();
    expect(results[0]?.status).toBe("skipped");
  });

  it("정상 수집이면 success", async () => {
    const source: JobPostingSourcePort = {
      id: "curated",
      label: "큐레이션",
      checkAvailability: () => ({ available: true }),
      fetchPostings: async () => [],
    };
    const uc = new SyncJobPostingsFromSource([source], emptyRepo(), emptyRuns(), clock, logger);
    const results = await uc.execute();
    expect(results[0]?.status).toBe("success");
  });
});
