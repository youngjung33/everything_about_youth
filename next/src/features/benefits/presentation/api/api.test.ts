import { describe, expect, it } from "vitest";
import type { Clock } from "@/common/application/system";
import { SearchPrograms } from "@/features/benefits/application/use-cases/search-programs";
import type { ProgramRepository, ProgramSearchQuery } from "@/features/benefits/application/ports/program-repository";
import { createProgram } from "@/features/benefits/domain/identity";
import type { BenefitProgram, BenefitProgramDraft } from "@/features/benefits/domain/program";
import { GetProgramDetail } from "@/features/benefits/application/use-cases/get-program-detail";
import { ManageSavedPrograms } from "@/features/benefits/application/use-cases/manage-saved-programs";
import type { SavedProgram, SavedProgramRepository } from "@/features/benefits/application/ports/saved-program-repository";
import {
  handleGetMeta,
  handleGetProgram,
  handleListPrograms,
  handleProgramCalendar,
  handleSaveProgram,
  type BenefitsApiDeps,
} from "./handlers";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };

const draft = (over: Partial<BenefitProgramDraft> = {}): BenefitProgramDraft => ({
  title: "서울 청년 월세",
  organization: "서울시",
  categoryId: "housing",
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

class MemorySaved implements SavedProgramRepository {
  rows: SavedProgram[] = [];
  async list() {
    return [...this.rows];
  }
  async isSaved(_userId: string, programId: string) {
    return this.rows.some((r) => r.programId === programId);
  }
  async count() {
    return this.rows.length;
  }
  async save(_userId: string, programId: string, savedAt: string) {
    if (!this.rows.some((r) => r.programId === programId)) this.rows.push({ programId, savedAt });
  }
  async remove(_userId: string, programId: string) {
    this.rows = this.rows.filter((r) => r.programId !== programId);
  }
}

class FakeRepo implements ProgramRepository {
  constructor(private readonly store: BenefitProgram[]) {}
  async search(query: ProgramSearchQuery) {
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

function setup(drafts: BenefitProgramDraft[]) {
  const programs = drafts.map(createProgram);
  const repo = new FakeRepo(programs);
  const saved = new MemorySaved();
  const deps: BenefitsApiDeps = {
    searchPrograms: new SearchPrograms(repo, clock),
    getProgramDetail: new GetProgramDetail(repo, clock),
    manageSavedPrograms: new ManageSavedPrograms(saved, repo, clock),
    syncRuns: { lastSuccessAt: async () => null },
    clock,
  };
  return { deps, programs, saved };
}

describe("benefits API handlers", () => {
  it("목록·상세·meta", async () => {
    const { deps, programs } = setup([draft()]);
    const list = await handleListPrograms(new URLSearchParams(), deps);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]!.id).toBe(programs[0]!.id);

    const detail = await handleGetProgram(programs[0]!.id, new URLSearchParams(), deps);
    expect(detail.body.title).toBe("서울 청년 월세");

    const meta = await handleGetMeta(deps);
    expect(meta.body.categories.length).toBeGreaterThan(0);
  });

  it("없는 id 는 PROGRAM_NOT_FOUND", async () => {
    const { deps } = setup([draft()]);
    await expect(handleGetProgram("missing", new URLSearchParams(), deps)).rejects.toMatchObject({ code: "PROGRAM_NOT_FOUND" });
  });

  it("캘린더 ICS", async () => {
    const { deps, programs } = setup([draft()]);
    const res = await handleProgramCalendar(programs[0]!.id, deps);
    expect(res.headers.get("Content-Type")).toContain("text/calendar");
  });

  it("마감일 없으면 BAD_REQUEST", async () => {
    const { deps, programs } = setup([draft({ applicationEnd: null })]);
    await expect(handleProgramCalendar(programs[0]!.id, deps)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("관심 저장 not_found", async () => {
    const { deps } = setup([]);
    await expect(handleSaveProgram("u1", "nope", deps)).rejects.toMatchObject({ code: "PROGRAM_NOT_FOUND" });
  });
});
