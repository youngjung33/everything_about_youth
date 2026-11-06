import { describe, expect, it } from "vitest";
import type { Clock } from "@/common/application/system";
import { createGuide } from "@/features/living/domain/identity";
import type { LivingGuideDraft } from "@/features/living/domain/guide";
import type { GuideRepository } from "../ports/guide-repository";
import { GetGuideDetail } from "./get-guide-detail";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };

const draft = (): LivingGuideDraft => ({
  title: "테스트",
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
});

class FakeRepo implements GuideRepository {
  constructor(private readonly store: ReturnType<typeof createGuide>[]) {}
  async search() {
    return { items: [], total: 0 };
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

describe("GetGuideDetail", () => {
  it("없는 id 는 null", async () => {
    const uc = new GetGuideDetail(new FakeRepo([]), clock);
    await expect(uc.execute("missing")).resolves.toBeNull();
  });

  it("있으면 program·status 를 돌려준다", async () => {
    const guide = createGuide(draft());
    const uc = new GetGuideDetail(new FakeRepo([guide]), clock);
    const item = await uc.execute(guide.id);
    expect(item?.program.id).toBe(guide.id);
    expect(item?.status).toBe("open");
    expect(item?.eligibility).toBeNull();
  });
});
