import { describe, expect, it } from "vitest";
import type { Clock } from "@/common/application/system";
import { createGuide } from "@/features/living/domain/identity";
import type { LivingGuide, LivingGuideDraft } from "@/features/living/domain/guide";
import type { GuideRepository } from "../ports/guide-repository";
import type { SavedGuide, SavedGuideRepository } from "../ports/saved-guide-repository";
import { ManageSavedGuides, MAX_SAVED_GUIDES } from "./manage-saved-guides";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };

const draft = (over: Partial<LivingGuideDraft> = {}): LivingGuideDraft => ({
  title: "제도",
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

describe("ManageSavedGuides", () => {
  it("save: 없는 guideId 는 not_found", async () => {
    const uc = new ManageSavedGuides(new MemorySaved(), new FakeRepo([]), clock);
    await expect(uc.save("u1", "nope")).resolves.toEqual({ status: "not_found" });
  });

  it("save: 상한이면 limit", async () => {
    const saved = new MemorySaved();
    saved.rows = Array.from({ length: MAX_SAVED_GUIDES }, (_, i) => ({
      guideId: `s${i}`,
      savedAt: "2026-10-01T00:00:00.000Z",
    }));
    const guide = createGuide(draft());
    const uc = new ManageSavedGuides(saved, new FakeRepo([guide]), clock);
    await expect(uc.save("u1", guide.id)).resolves.toEqual({ status: "limit", max: MAX_SAVED_GUIDES });
  });

  it("merge: limit 에 걸리면 그 시점에서 멈춘다", async () => {
    const saved = new MemorySaved();
    saved.rows = Array.from({ length: MAX_SAVED_GUIDES }, (_, i) => ({
      guideId: `full${i}`,
      savedAt: "2026-10-01T00:00:00.000Z",
    }));
    const extra = createGuide(draft({ title: "추가" }));
    const uc = new ManageSavedGuides(saved, new FakeRepo([extra]), clock);
    const ids = await uc.merge("u1", [extra.id, "full0"]);
    expect(ids).toHaveLength(MAX_SAVED_GUIDES);
    expect(ids).not.toContain(extra.id);
  });

  it("list: DB 에 없는 id 는 건너뛴다", async () => {
    const saved = new MemorySaved();
    saved.rows = [{ guideId: "ghost", savedAt: "2026-10-01T00:00:00.000Z" }];
    const uc = new ManageSavedGuides(saved, new FakeRepo([]), clock);
    await expect(uc.list("u1")).resolves.toEqual([]);
  });

  it("save: 이미 있으면 already", async () => {
    const guide = createGuide(draft());
    const saved = new MemorySaved();
    saved.rows = [{ guideId: guide.id, savedAt: "2026-10-01T00:00:00.000Z" }];
    const uc = new ManageSavedGuides(saved, new FakeRepo([guide]), clock);
    await expect(uc.save("u1", guide.id)).resolves.toEqual({ status: "already" });
  });

  it("save: 정상 저장", async () => {
    const guide = createGuide(draft());
    const saved = new MemorySaved();
    const uc = new ManageSavedGuides(saved, new FakeRepo([guide]), clock);
    await expect(uc.save("u1", guide.id)).resolves.toEqual({ status: "saved" });
    expect(await uc.listIds("u1")).toEqual([guide.id]);
  });
});
