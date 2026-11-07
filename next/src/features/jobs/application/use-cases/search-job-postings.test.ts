import { describe, expect, it } from "vitest";
import type { Clock } from "@/common/application/system";
import { createJobPosting } from "@/features/jobs/domain/identity";
import type { JobPosting, JobPostingDraft } from "@/features/jobs/domain/job-posting";
import type { JobPostingRepository, PostingSearchQuery } from "../ports/posting-repository";
import { SearchJobPostings } from "./search-job-postings";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };

const draft = (title: string): JobPostingDraft => ({
  title,
  organization: "기관",
  hireTypeId: "jeonse_loan",
  tags: [],
  regions: [{ sido: "서울", sigungu: null }],
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-20",
  announcementDate: null,
  summary: "요약",
  url: "https://example.com",
  sources: [{ source: "demo", externalId: title, url: null, raw: {}, fetchedAt: "2026-10-11T00:00:00.000Z" }],
});

class FakeRepo implements JobPostingRepository {
  constructor(private readonly store: JobPosting[]) {}
  async search(query: PostingSearchQuery) {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? this.store.length;
    const items = this.store.slice(offset, offset + limit);
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

describe("SearchJobPostings", () => {
  it("page·pageSize 하한/상한을 clamp 한다", async () => {
    const schemes = [createJobPosting(draft("a"))];
    const uc = new SearchJobPostings(new FakeRepo(schemes), clock);
    const r = await uc.execute({ filters: {}, page: 0, pageSize: 999 });
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(100);
  });

  it("verdict 필터는 profile 이 없으면 repo 페이징만 한다", async () => {
    const schemes = [createJobPosting(draft("one")), createJobPosting(draft("two"))];
    const uc = new SearchJobPostings(new FakeRepo(schemes), clock);
    const r = await uc.execute({ filters: {}, verdicts: ["ineligible"] });
    expect(r.items).toHaveLength(2);
  });

  it("목록·페이지 정보를 돌려준다", async () => {
    const schemes = [createJobPosting(draft("one")), createJobPosting(draft("two"))];
    const uc = new SearchJobPostings(new FakeRepo(schemes), clock);
    const r = await uc.execute({ filters: {}, page: 1, pageSize: 1 });
    expect(r.items).toHaveLength(1);
    expect(r.total).toBe(2);
    expect(r.totalPages).toBe(2);
  });
});
