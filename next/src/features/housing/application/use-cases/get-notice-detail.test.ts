import { describe, expect, it } from "vitest";
import type { Clock } from "@/common/application/system";
import { createNotice } from "@/features/housing/domain/identity";
import type { Notice, NoticeDraft } from "@/features/housing/domain/notice";
import type { NoticeRepository } from "../ports/notice-repository";
import { GetNoticeDetail } from "./get-notice-detail";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };

const draft = (over: Partial<NoticeDraft> = {}): NoticeDraft => ({
  title: "행복주택",
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
  url: null,
  complexes: [],
  sources: [{ source: "lh", externalId: "1", url: null, raw: {}, fetchedAt: "" }],
  ...over,
});

class MemoryRepo implements NoticeRepository {
  constructor(private readonly store: Map<string, Notice>) {}
  async search() {
    return { items: [...this.store.values()], total: this.store.size };
  }
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async findExistingFor() {
    return [];
  }
  async upsertMany() {
    return { inserted: 0, updated: 0 };
  }
}

describe("GetNoticeDetail", () => {
  const notice = createNotice(draft());
  const repo = new MemoryRepo(new Map([[notice.id, notice]]));

  it("없으면 null", async () => {
    expect(await new GetNoticeDetail(new MemoryRepo(new Map()), clock).execute("missing")).toBeNull();
  });

  it("있으면 status 와 notice 를 반환", async () => {
    const item = await new GetNoticeDetail(repo, clock).execute(notice.id);
    expect(item!.notice.id).toBe(notice.id);
    expect(item!.status).toBe("open");
    expect(item!.eligibility).toBeNull();
  });

  it("profile 이 있으면 eligibility 를 계산한다", async () => {
    const item = await new GetNoticeDetail(repo, clock).execute(notice.id, { age: 30, isHomeless: true });
    expect(item!.eligibility?.verdict).toBe("check");
  });
});
