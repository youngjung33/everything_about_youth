import { describe, expect, it } from "vitest";
import { createNotice } from "@/features/housing/domain/identity";
import type { Notice, NoticeDraft } from "@/features/housing/domain/notice";
import type { Clock } from "@/common/application/system";
import type { NoticeRepository } from "../ports/notice-repository";
import type { SavedNotice, SavedNoticeRepository } from "../ports/saved-notice-repository";
import { ManageSavedNotices, MAX_SAVED_NOTICES } from "./manage-saved-notices";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };

const draft = (over: Partial<NoticeDraft> = {}): NoticeDraft => ({
  title: "행복주택 모집",
  organization: "LH",
  supplyType: "happy_housing",
  housingTypes: ["apartment"],
  regions: [{ sido: "서울", sigungu: null }],
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-20",
  announcementDate: null,
  winnerAnnouncementDate: null,
  totalHouseholds: null,
  eligibilityText: null,
  url: "https://example.com/n",
  complexes: [],
  sources: [{ source: "lh", externalId: "1", url: null, raw: {}, fetchedAt: "" }],
  ...over,
});

class MemoryNotices implements NoticeRepository {
  constructor(private readonly items: Notice[]) {}
  async search() {
    return { items: this.items, total: this.items.length };
  }
  async findById(id: string) {
    return this.items.find((n) => n.id === id) ?? null;
  }
  async findExistingFor() {
    return [];
  }
  async upsertMany() {
    return { inserted: 0, updated: 0 };
  }
}

class MemorySaved implements SavedNoticeRepository {
  rows: SavedNotice[] = [];
  async list() {
    return [...this.rows].sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  }
  async isSaved(_userId: string, noticeId: string) {
    return this.rows.some((r) => r.noticeId === noticeId);
  }
  async count() {
    return this.rows.length;
  }
  async save(_userId: string, noticeId: string, savedAt: string) {
    if (this.rows.some((r) => r.noticeId === noticeId)) return;
    this.rows.push({ noticeId, savedAt });
  }
  async remove(_userId: string, noticeId: string) {
    this.rows = this.rows.filter((r) => r.noticeId !== noticeId);
  }
}

function setup(notices: Notice[] = []) {
  const saved = new MemorySaved();
  const uc = new ManageSavedNotices(saved, new MemoryNotices(notices), clock);
  return { uc, saved };
}

describe("ManageSavedNotices", () => {
  const a = createNotice(draft({ title: "A", sources: [{ source: "lh", externalId: "a", url: null, raw: {}, fetchedAt: "" }] }));
  const b = createNotice(draft({ title: "B", sources: [{ source: "lh", externalId: "b", url: null, raw: {}, fetchedAt: "" }] }));

  it("있는 공고만 저장하고, 두 번 저장하면 already", async () => {
    const { uc } = setup([a]);
    expect(await uc.save("u1", a.id)).toEqual({ status: "saved" });
    expect(await uc.save("u1", a.id)).toEqual({ status: "already" });
    expect(await uc.save("u1", "nope")).toEqual({ status: "not_found" });
    expect(await uc.listIds("u1")).toEqual([a.id]);
  });

  it("상한을 넘으면 더 넣지 않는다", async () => {
    const notices = Array.from({ length: MAX_SAVED_NOTICES + 1 }, (_, i) =>
      createNotice(draft({ title: `n${i}`, sources: [{ source: "lh", externalId: `e${i}`, url: null, raw: {}, fetchedAt: "" }] })),
    );
    const { uc } = setup(notices);
    for (let i = 0; i < MAX_SAVED_NOTICES; i++) expect((await uc.save("u1", notices[i]!.id)).status).toBe("saved");
    expect(await uc.save("u1", notices[MAX_SAVED_NOTICES]!.id)).toEqual({ status: "limit", max: MAX_SAVED_NOTICES });
  });

  it("목록은 최근 저장이 앞이고, 공고가 없으면 건너뛴다", async () => {
    const { uc, saved } = setup([a]);
    await saved.save("u1", "gone", "2026-10-11T00:00:00.000Z");
    await uc.save("u1", a.id);
    const list = await uc.list("u1");
    expect(list.map((i) => i.notice.id)).toEqual([a.id]);
    expect(list[0]!.status).toBe("open");
  });

  it("내 조건을 주면 자격 판정을 붙인다", async () => {
    const { uc } = setup([a]);
    await uc.save("u1", a.id);
    const [item] = await uc.list("u1", { age: 30, isHomeless: true });
    expect(item!.eligibility).not.toBeNull();
  });

  it("저장 해제", async () => {
    const { uc } = setup([a]);
    await uc.save("u1", a.id);
    await uc.unsave("u1", a.id);
    expect(await uc.listIds("u1")).toEqual([]);
  });

  it("합치기: 없는 공고는 건너뛰고, 있는 것만 남긴다", async () => {
    const { uc } = setup([a, b]);
    await uc.save("u1", a.id);
    const ids = await uc.merge("u1", ["  ", b.id, "nope", a.id, b.id]);
    expect(ids.sort()).toEqual([a.id, b.id].sort());
  });

  it("합치기: 상한에 도달하면 더 이상 추가하지 않는다", async () => {
    const notices = Array.from({ length: MAX_SAVED_NOTICES + 2 }, (_, i) =>
      createNotice(draft({ title: `n${i}`, sources: [{ source: "lh", externalId: `e${i}`, url: null, raw: {}, fetchedAt: "" }] })),
    );
    const { uc } = setup(notices);
    const ids = await uc.merge(
      "u1",
      notices.map((n) => n.id),
    );
    expect(ids).toHaveLength(MAX_SAVED_NOTICES);
  });

  it("저장 해제: 없어도 오류 없이 idempotent", async () => {
    const { uc } = setup([a]);
    await uc.unsave("u1", "never-saved");
    expect(await uc.listIds("u1")).toEqual([]);
  });
});
