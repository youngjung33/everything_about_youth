import { describe, expect, it } from "vitest";
import type { Clock } from "@/common/application/system";
import { createScheme } from "@/features/finance/domain/identity";
import type { FinanceScheme, FinanceSchemeDraft } from "@/features/finance/domain/scheme";
import type { SchemeRepository } from "../ports/scheme-repository";
import type { SavedScheme, SavedSchemeRepository } from "../ports/saved-scheme-repository";
import { ManageSavedSchemes, MAX_SAVED_PROGRAMS } from "./manage-saved-schemes";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };

const draft = (over: Partial<FinanceSchemeDraft> = {}): FinanceSchemeDraft => ({
  title: "제도",
  organization: "기관",
  productTypeId: "jeonse_loan",
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

describe("ManageSavedSchemes", () => {
  it("save: 없는 schemeId 는 not_found", async () => {
    const uc = new ManageSavedSchemes(new MemorySaved(), new FakeRepo([]), clock);
    await expect(uc.save("u1", "nope")).resolves.toEqual({ status: "not_found" });
  });

  it("save: 상한이면 limit", async () => {
    const saved = new MemorySaved();
    saved.rows = Array.from({ length: MAX_SAVED_PROGRAMS }, (_, i) => ({
      schemeId: `s${i}`,
      savedAt: "2026-10-01T00:00:00.000Z",
    }));
    const scheme = createScheme(draft());
    const uc = new ManageSavedSchemes(saved, new FakeRepo([scheme]), clock);
    await expect(uc.save("u1", scheme.id)).resolves.toEqual({ status: "limit", max: MAX_SAVED_PROGRAMS });
  });

  it("merge: limit 에 걸리면 그 시점에서 멈춘다", async () => {
    const saved = new MemorySaved();
    saved.rows = Array.from({ length: MAX_SAVED_PROGRAMS }, (_, i) => ({
      schemeId: `full${i}`,
      savedAt: "2026-10-01T00:00:00.000Z",
    }));
    const extra = createScheme(draft({ title: "추가" }));
    const uc = new ManageSavedSchemes(saved, new FakeRepo([extra]), clock);
    const ids = await uc.merge("u1", [extra.id, "full0"]);
    expect(ids).toHaveLength(MAX_SAVED_PROGRAMS);
    expect(ids).not.toContain(extra.id);
  });

  it("list: DB 에 없는 id 는 건너뛴다", async () => {
    const saved = new MemorySaved();
    saved.rows = [{ schemeId: "ghost", savedAt: "2026-10-01T00:00:00.000Z" }];
    const uc = new ManageSavedSchemes(saved, new FakeRepo([]), clock);
    await expect(uc.list("u1")).resolves.toEqual([]);
  });

  it("save: 이미 있으면 already", async () => {
    const scheme = createScheme(draft());
    const saved = new MemorySaved();
    saved.rows = [{ schemeId: scheme.id, savedAt: "2026-10-01T00:00:00.000Z" }];
    const uc = new ManageSavedSchemes(saved, new FakeRepo([scheme]), clock);
    await expect(uc.save("u1", scheme.id)).resolves.toEqual({ status: "already" });
  });

  it("save: 정상 저장", async () => {
    const scheme = createScheme(draft());
    const saved = new MemorySaved();
    const uc = new ManageSavedSchemes(saved, new FakeRepo([scheme]), clock);
    await expect(uc.save("u1", scheme.id)).resolves.toEqual({ status: "saved" });
    expect(await uc.listIds("u1")).toEqual([scheme.id]);
  });
});
