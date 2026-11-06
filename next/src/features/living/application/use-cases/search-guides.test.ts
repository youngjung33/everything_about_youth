import { describe, expect, it } from "vitest";
import type { Clock } from "@/common/application/system";
import { createGuide } from "@/features/living/domain/identity";
import type { LivingGuide, LivingGuideDraft } from "@/features/living/domain/guide";
import type { GuideRepository, GuideSearchQuery } from "../ports/guide-repository";
import { SearchGuides } from "./search-guides";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };

const draft = (title: string): LivingGuideDraft => ({
  title,
  organization: "기관",
  procedureTypeId: "move_in",
  tags: [],
  regions: [{ sido: "서울", sigungu: null }],
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-20",
  announcementDate: null,
  summary: "요약",
  checklistSteps: [],
  url: "https://example.com",
  sources: [{ source: "demo", externalId: title, url: null, raw: {}, fetchedAt: "2026-10-11T00:00:00.000Z" }],
});

class FakeRepo implements GuideRepository {
  constructor(private readonly store: LivingGuide[]) {}
  async search(query: GuideSearchQuery) {
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

describe("SearchGuides", () => {
  it("page·pageSize 하한/상한을 clamp 한다", async () => {
    const guides = [createGuide(draft("a"))];
    const uc = new SearchGuides(new FakeRepo(guides), clock);
    const r = await uc.execute({ filters: {}, page: 0, pageSize: 999 });
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(100);
  });

  it("eligibility 는 항상 null", async () => {
    const guides = [createGuide(draft("one"))];
    const uc = new SearchGuides(new FakeRepo(guides), clock);
    const r = await uc.execute({ filters: {} });
    expect(r.items[0]!.eligibility).toBeNull();
  });

  it("목록·페이지 정보를 돌려준다", async () => {
    const guides = [createGuide(draft("one")), createGuide(draft("two"))];
    const uc = new SearchGuides(new FakeRepo(guides), clock);
    const r = await uc.execute({ filters: {}, page: 1, pageSize: 1 });
    expect(r.items).toHaveLength(1);
    expect(r.total).toBe(2);
    expect(r.totalPages).toBe(2);
  });
});
