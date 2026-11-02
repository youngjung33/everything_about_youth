import { describe, expect, it } from "vitest";
import type { Clock } from "@/common/application/system";
import { createScheme } from "@/features/finance/domain/identity";
import type { FinanceScheme, FinanceSchemeDraft } from "@/features/finance/domain/scheme";
import type { SchemeRepository, SchemeSearchQuery } from "../ports/scheme-repository";
import { SearchSchemes } from "./search-schemes";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };

const draft = (title: string): FinanceSchemeDraft => ({
  title,
  organization: "기관",
  productTypeId: "jeonse_loan",
  tags: [],
  regions: [{ sido: "서울", sigungu: null }],
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-20",
  announcementDate: null,
  summary: "요약",
  url: "https://example.com",
  sources: [{ source: "demo", externalId: title, url: null, raw: {}, fetchedAt: "2026-10-11T00:00:00.000Z" }],
});

class FakeRepo implements SchemeRepository {
  constructor(private readonly store: FinanceScheme[]) {}
  async search(query: SchemeSearchQuery) {
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

describe("SearchSchemes", () => {
  it("page·pageSize 하한/상한을 clamp 한다", async () => {
    const schemes = [createScheme(draft("a"))];
    const uc = new SearchSchemes(new FakeRepo(schemes), clock);
    const r = await uc.execute({ filters: {}, page: 0, pageSize: 999 });
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(100);
  });

  it("verdict 필터는 profile 이 없으면 repo 페이징만 한다", async () => {
    const schemes = [createScheme(draft("one")), createScheme(draft("two"))];
    const uc = new SearchSchemes(new FakeRepo(schemes), clock);
    const r = await uc.execute({ filters: {}, verdicts: ["ineligible"] });
    expect(r.items).toHaveLength(2);
  });

  it("목록·페이지 정보를 돌려준다", async () => {
    const schemes = [createScheme(draft("one")), createScheme(draft("two"))];
    const uc = new SearchSchemes(new FakeRepo(schemes), clock);
    const r = await uc.execute({ filters: {}, page: 1, pageSize: 1 });
    expect(r.items).toHaveLength(1);
    expect(r.total).toBe(2);
    expect(r.totalPages).toBe(2);
  });
});
