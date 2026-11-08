import { describe, expect, it } from "vitest";
import type { Clock } from "@/common/application/system";
import { createJobPosting } from "@/features/jobs/domain/identity";
import type { JobPosting, JobPostingDraft } from "@/features/jobs/domain/job-posting";
import type { JobPostingRepository } from "../ports/posting-repository";
import type { SavedPosting, SavedJobPostingRepository } from "../ports/saved-posting-repository";
import { ManageSavedJobPostings, MAX_SAVED_PROGRAMS } from "./manage-saved-postings";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };

const draft = (over: Partial<JobPostingDraft> = {}): JobPostingDraft => ({
  title: "공고",
  organization: "기관",
  hireTypeId: "youth",
  tags: [],
  regions: [{ sido: "서울", sigungu: null }],
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-20",
  announcementDate: null,
  summary: "요약",
  url: "https://example.com",
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
  async search() {
    return { items: this.store, total: this.store.length };
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

describe("ManageSavedJobPostings", () => {
  it("save: 없는 postingId 는 not_found", async () => {
    const uc = new ManageSavedJobPostings(new MemorySaved(), new FakeRepo([]), clock);
    await expect(uc.save("u1", "nope")).resolves.toEqual({ status: "not_found" });
  });

  it("save: 상한이면 limit", async () => {
    const saved = new MemorySaved();
    saved.rows = Array.from({ length: MAX_SAVED_PROGRAMS }, (_, i) => ({
      postingId: `s${i}`,
      savedAt: "2026-10-01T00:00:00.000Z",
    }));
    const scheme = createJobPosting(draft());
    const uc = new ManageSavedJobPostings(saved, new FakeRepo([scheme]), clock);
    await expect(uc.save("u1", scheme.id)).resolves.toEqual({ status: "limit", max: MAX_SAVED_PROGRAMS });
  });

  it("merge: limit 에 걸리면 그 시점에서 멈춘다", async () => {
    const saved = new MemorySaved();
    saved.rows = Array.from({ length: MAX_SAVED_PROGRAMS }, (_, i) => ({
      postingId: `full${i}`,
      savedAt: "2026-10-01T00:00:00.000Z",
    }));
    const extra = createJobPosting(draft({ title: "추가" }));
    const uc = new ManageSavedJobPostings(saved, new FakeRepo([extra]), clock);
    const ids = await uc.merge("u1", [extra.id, "full0"]);
    expect(ids).toHaveLength(MAX_SAVED_PROGRAMS);
    expect(ids).not.toContain(extra.id);
  });

  it("list: DB 에 없는 id 는 건너뛴다", async () => {
    const saved = new MemorySaved();
    saved.rows = [{ postingId: "ghost", savedAt: "2026-10-01T00:00:00.000Z" }];
    const uc = new ManageSavedJobPostings(saved, new FakeRepo([]), clock);
    await expect(uc.list("u1")).resolves.toEqual([]);
  });

  it("save: 이미 있으면 already", async () => {
    const scheme = createJobPosting(draft());
    const saved = new MemorySaved();
    saved.rows = [{ postingId: scheme.id, savedAt: "2026-10-01T00:00:00.000Z" }];
    const uc = new ManageSavedJobPostings(saved, new FakeRepo([scheme]), clock);
    await expect(uc.save("u1", scheme.id)).resolves.toEqual({ status: "already" });
  });

  it("save: 정상 저장", async () => {
    const scheme = createJobPosting(draft());
    const saved = new MemorySaved();
    const uc = new ManageSavedJobPostings(saved, new FakeRepo([scheme]), clock);
    await expect(uc.save("u1", scheme.id)).resolves.toEqual({ status: "saved" });
    expect(await uc.listIds("u1")).toEqual([scheme.id]);
  });

  it("list: 저장된 공고 요약을 반환한다", async () => {
    const scheme = createJobPosting(draft());
    const saved = new MemorySaved();
    saved.rows = [{ postingId: scheme.id, savedAt: "2026-10-01T00:00:00.000Z" }];
    const uc = new ManageSavedJobPostings(saved, new FakeRepo([scheme]), clock);
    const items = await uc.list("u1");
    expect(items).toHaveLength(1);
    expect(items[0]!.program.id).toBe(scheme.id);
  });
});
