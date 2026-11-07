import { describe, expect, it } from "vitest";
import type { Clock } from "@/common/application/system";
import { SearchJobPostings } from "@/features/jobs/application/use-cases/search-job-postings";
import type { JobPostingRepository, PostingSearchQuery } from "@/features/jobs/application/ports/posting-repository";
import { createJobPosting } from "@/features/jobs/domain/identity";
import type { JobPosting, JobPostingDraft } from "@/features/jobs/domain/job-posting";
import { GetJobPostingDetail } from "@/features/jobs/application/use-cases/get-job-posting-detail";
import { ManageSavedJobPostings, MAX_SAVED_PROGRAMS } from "@/features/jobs/application/use-cases/manage-saved-postings";
import type { SavedPosting, SavedJobPostingRepository } from "@/features/jobs/application/ports/saved-posting-repository";
import {
  handleGetMeta,
  handleGetScheme,
  handleListSchemes,
  handleSchemeCalendar,
  handleSaveScheme,
  type JobsApiDeps,
} from "./handlers";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };

const draft = (over: Partial<JobPostingDraft> = {}): JobPostingDraft => ({
  title: "서울 청년 월세",
  organization: "서울시",
  hireTypeId: "youth",
  tags: ["월세"],
  regions: [{ sido: "서울", sigungu: "마포구" }],
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-15",
  announcementDate: "2026-09-28",
  summary: "요약",
  url: "https://example.com/p1",
  sources: [{ source: "demo", externalId: "1", url: null, raw: {}, fetchedAt: "2026-10-11T00:00:00.000Z" }],
  ...over,
});

class MemorySaved implements SavedJobPostingRepository {
  rows: SavedPosting[] = [];
  async list() {
    return [...this.rows];
  }
  async isSaved(_userId: string, postingId: string) {
    return this.rows.some((r) => r.postingId === postingId);
  }
  async count() {
    return this.rows.length;
  }
  async save(_userId: string, postingId: string, savedAt: string) {
    if (!this.rows.some((r) => r.postingId === postingId)) this.rows.push({ postingId, savedAt });
  }
  async remove(_userId: string, postingId: string) {
    this.rows = this.rows.filter((r) => r.postingId !== postingId);
  }
}

class FakeRepo implements JobPostingRepository {
  constructor(private readonly store: JobPosting[]) {}
  async search(query: PostingSearchQuery) {
    const items = query.limit !== undefined ? this.store.slice(query.offset ?? 0, (query.offset ?? 0) + query.limit) : this.store;
    return { items, total: this.store.length };
  }
  async findById(id: string) {
    return this.store.find((p) => p.id === id) ?? null;
  }
  async findExistingFor() {
    return [];
  }
  async upsertMany() {
    return { inserted: 0, updated: 0 };
  }
}

function setup(drafts: JobPostingDraft[]) {
  const schemes = drafts.map(createJobPosting);
  const repo = new FakeRepo(schemes);
  const saved = new MemorySaved();
  const deps: JobsApiDeps = {
    searchPostings: new SearchJobPostings(repo, clock),
    getJobPostingDetail: new GetJobPostingDetail(repo, clock),
    manageSavedPostings: new ManageSavedJobPostings(saved, repo, clock),
    syncRuns: { lastSuccessAt: async () => null },
    clock,
  };
  return { deps, schemes, saved };
}

describe("jobs API handlers", () => {
  it("없는 id 는 POSTING_NOT_FOUND", async () => {
    const { deps } = setup([draft()]);
    await expect(handleGetScheme("missing", new URLSearchParams(), deps)).rejects.toMatchObject({ code: "POSTING_NOT_FOUND" });
  });

  it("관심 저장 not_found", async () => {
    const { deps } = setup([]);
    await expect(handleSaveScheme("u1", "nope", deps)).rejects.toMatchObject({ code: "POSTING_NOT_FOUND" });
  });

  it("마감일 없으면 BAD_REQUEST", async () => {
    const { deps, schemes } = setup([draft({ applicationEnd: null })]);
    await expect(handleSchemeCalendar(schemes[0]!.id, deps)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("관심 상한이면 BAD_REQUEST", async () => {
    const { deps, schemes, saved } = setup([draft()]);
    saved.rows = Array.from({ length: MAX_SAVED_PROGRAMS }, (_, i) => ({
      postingId: `full${i}`,
      savedAt: "2026-10-01T00:00:00.000Z",
    }));
    await expect(handleSaveScheme("u1", schemes[0]!.id, deps)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("pageSize 는 API 상한(50)으로 clamp", async () => {
    const { deps } = setup([draft()]);
    const list = await handleListSchemes(new URLSearchParams({ pageSize: "999" }), deps);
    expect(list.body.pageSize).toBe(50);
  });

  it("목록·상세·meta", async () => {
    const { deps, schemes } = setup([draft()]);
    const list = await handleListSchemes(new URLSearchParams(), deps);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]!.id).toBe(schemes[0]!.id);

    const detail = await handleGetScheme(schemes[0]!.id, new URLSearchParams(), deps);
    expect(detail.body.title).toBe("서울 청년 월세");

    const meta = await handleGetMeta(deps);
    expect(meta.body.categories.length).toBeGreaterThan(0);
  });

  it("캘린더 ICS", async () => {
    const { deps, schemes } = setup([draft()]);
    const res = await handleSchemeCalendar(schemes[0]!.id, deps);
    expect(res.headers.get("Content-Type")).toContain("text/calendar");
  });
});
