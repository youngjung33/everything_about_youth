import { describe, expect, it } from "vitest";
import type { Clock } from "@/common/application/system";
import { SearchSchemes } from "@/features/finance/application/use-cases/search-schemes";
import type { SchemeRepository, SchemeSearchQuery } from "@/features/finance/application/ports/scheme-repository";
import { createScheme } from "@/features/finance/domain/identity";
import type { FinanceScheme, FinanceSchemeDraft } from "@/features/finance/domain/scheme";
import { GetSchemeDetail } from "@/features/finance/application/use-cases/get-scheme-detail";
import { ManageSavedSchemes, MAX_SAVED_PROGRAMS } from "@/features/finance/application/use-cases/manage-saved-schemes";
import type { SavedScheme, SavedSchemeRepository } from "@/features/finance/application/ports/saved-scheme-repository";
import {
  handleGetMeta,
  handleGetScheme,
  handleListSchemes,
  handleSchemeCalendar,
  handleSaveScheme,
  type FinanceApiDeps,
} from "./handlers";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };

const draft = (over: Partial<FinanceSchemeDraft> = {}): FinanceSchemeDraft => ({
  title: "서울 청년 월세",
  organization: "서울시",
  productTypeId: "jeonse_loan",
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

class MemorySaved implements SavedSchemeRepository {
  rows: SavedScheme[] = [];
  async list() {
    return [...this.rows];
  }
  async isSaved(_userId: string, schemeId: string) {
    return this.rows.some((r) => r.schemeId === schemeId);
  }
  async count() {
    return this.rows.length;
  }
  async save(_userId: string, schemeId: string, savedAt: string) {
    if (!this.rows.some((r) => r.schemeId === schemeId)) this.rows.push({ schemeId, savedAt });
  }
  async remove(_userId: string, schemeId: string) {
    this.rows = this.rows.filter((r) => r.schemeId !== schemeId);
  }
}

class FakeRepo implements SchemeRepository {
  constructor(private readonly store: FinanceScheme[]) {}
  async search(query: SchemeSearchQuery) {
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

function setup(drafts: FinanceSchemeDraft[]) {
  const schemes = drafts.map(createScheme);
  const repo = new FakeRepo(schemes);
  const saved = new MemorySaved();
  const deps: FinanceApiDeps = {
    searchSchemes: new SearchSchemes(repo, clock),
    getSchemeDetail: new GetSchemeDetail(repo, clock),
    manageSavedSchemes: new ManageSavedSchemes(saved, repo, clock),
    syncRuns: { lastSuccessAt: async () => null },
    clock,
  };
  return { deps, schemes, saved };
}

describe("finance API handlers", () => {
  it("없는 id 는 SCHEME_NOT_FOUND", async () => {
    const { deps } = setup([draft()]);
    await expect(handleGetScheme("missing", new URLSearchParams(), deps)).rejects.toMatchObject({ code: "SCHEME_NOT_FOUND" });
  });

  it("관심 저장 not_found", async () => {
    const { deps } = setup([]);
    await expect(handleSaveScheme("u1", "nope", deps)).rejects.toMatchObject({ code: "SCHEME_NOT_FOUND" });
  });

  it("마감일 없으면 BAD_REQUEST", async () => {
    const { deps, schemes } = setup([draft({ applicationEnd: null })]);
    await expect(handleSchemeCalendar(schemes[0]!.id, deps)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("관심 상한이면 BAD_REQUEST", async () => {
    const { deps, schemes, saved } = setup([draft()]);
    saved.rows = Array.from({ length: MAX_SAVED_PROGRAMS }, (_, i) => ({
      schemeId: `full${i}`,
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
