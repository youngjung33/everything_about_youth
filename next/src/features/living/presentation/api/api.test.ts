import { describe, expect, it } from "vitest";
import type { Clock } from "@/common/application/system";
import { SearchGuides } from "@/features/living/application/use-cases/search-guides";
import type { GuideRepository, GuideSearchQuery } from "@/features/living/application/ports/guide-repository";
import { createGuide } from "@/features/living/domain/identity";
import type { LivingGuide, LivingGuideDraft } from "@/features/living/domain/guide";
import { GetGuideDetail } from "@/features/living/application/use-cases/get-guide-detail";
import { ManageSavedGuides, MAX_SAVED_GUIDES } from "@/features/living/application/use-cases/manage-saved-guides";
import type { SavedGuide, SavedGuideRepository } from "@/features/living/application/ports/saved-guide-repository";
import {
  handleGetMeta,
  handleGetGuide,
  handleListGuides,
  handleGuideCalendar,
  handleSaveGuide,
  type LivingApiDeps,
} from "./handlers";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };

const draft = (over: Partial<LivingGuideDraft> = {}): LivingGuideDraft => ({
  title: "전입신고",
  organization: "행정안전부",
  procedureTypeId: "move_in",
  tags: ["전입"],
  regions: [{ sido: "서울", sigungu: "마포구" }],
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-15",
  announcementDate: "2026-09-28",
  summary: "요약",
  checklistSteps: [{ order: 1, title: "준비", summary: "서류", url: null }],
  url: "https://example.com/p1",
  sources: [{ source: "demo", externalId: "1", url: null, raw: {}, fetchedAt: "2026-10-11T00:00:00.000Z" }],
  ...over,
});

class MemorySaved implements SavedGuideRepository {
  rows: SavedGuide[] = [];
  async list() {
    return [...this.rows];
  }
  async isSaved(_userId: string, guideId: string) {
    return this.rows.some((r) => r.guideId === guideId);
  }
  async count() {
    return this.rows.length;
  }
  async save(_userId: string, guideId: string, savedAt: string) {
    if (!this.rows.some((r) => r.guideId === guideId)) this.rows.push({ guideId, savedAt });
  }
  async remove(_userId: string, guideId: string) {
    this.rows = this.rows.filter((r) => r.guideId !== guideId);
  }
}

class FakeRepo implements GuideRepository {
  constructor(private readonly store: LivingGuide[]) {}
  async search(query: GuideSearchQuery) {
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

function setup(drafts: LivingGuideDraft[]) {
  const guides = drafts.map(createGuide);
  const repo = new FakeRepo(guides);
  const saved = new MemorySaved();
  const deps: LivingApiDeps = {
    searchGuides: new SearchGuides(repo, clock),
    getGuideDetail: new GetGuideDetail(repo, clock),
    manageSavedGuides: new ManageSavedGuides(saved, repo, clock),
    syncRuns: { lastSuccessAt: async () => null },
    clock,
  };
  return { deps, guides, saved };
}

describe("living API handlers", () => {
  it("없는 id 는 GUIDE_NOT_FOUND", async () => {
    const { deps } = setup([draft()]);
    await expect(handleGetGuide("missing", new URLSearchParams(), deps)).rejects.toMatchObject({ code: "GUIDE_NOT_FOUND" });
  });

  it("관심 저장 not_found", async () => {
    const { deps } = setup([]);
    await expect(handleSaveGuide("u1", "nope", deps)).rejects.toMatchObject({ code: "GUIDE_NOT_FOUND" });
  });

  it("마감일 없으면 BAD_REQUEST", async () => {
    const { deps, guides } = setup([draft({ applicationEnd: null })]);
    await expect(handleGuideCalendar(guides[0]!.id, deps)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("관심 상한이면 BAD_REQUEST", async () => {
    const { deps, guides, saved } = setup([draft()]);
    saved.rows = Array.from({ length: MAX_SAVED_GUIDES }, (_, i) => ({
      guideId: `full${i}`,
      savedAt: "2026-10-01T00:00:00.000Z",
    }));
    await expect(handleSaveGuide("u1", guides[0]!.id, deps)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("pageSize 는 API 상한(50)으로 clamp", async () => {
    const { deps } = setup([draft()]);
    const list = await handleListGuides(new URLSearchParams({ pageSize: "999" }), deps);
    expect(list.body.pageSize).toBe(50);
  });

  it("목록·상세·meta", async () => {
    const { deps, guides } = setup([draft()]);
    const list = await handleListGuides(new URLSearchParams(), deps);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]!.id).toBe(guides[0]!.id);
    expect(list.body.items[0]!.eligibility).toBeNull();

    const detail = await handleGetGuide(guides[0]!.id, new URLSearchParams(), deps);
    expect(detail.body.title).toBe("전입신고");
    expect(detail.body.checklistSteps).toHaveLength(1);

    const meta = await handleGetMeta(deps);
    expect(meta.body.procedureTypes.length).toBeGreaterThan(0);
    expect(meta.body).not.toHaveProperty("standards");
  });

  it("캘린더 ICS", async () => {
    const { deps, guides } = setup([draft()]);
    const res = await handleGuideCalendar(guides[0]!.id, deps);
    expect(res.headers.get("Content-Type")).toContain("text/calendar");
  });
});
