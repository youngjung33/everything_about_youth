import { describe, expect, it } from "vitest";
import type { Clock } from "@/common/application/system";
import { createJobPosting } from "@/features/jobs/domain/identity";
import type { JobPostingDraft } from "@/features/jobs/domain/job-posting";
import type { JobPostingRepository } from "../ports/posting-repository";
import { GetJobPostingDetail } from "./get-job-posting-detail";

const clock: Clock = { now: () => new Date("2026-10-12T03:00:00Z") };

const draft = (): JobPostingDraft => ({
  title: "테스트",
  organization: "기관",
  hireTypeId: "jeonse_loan",
  tags: [],
  regions: [{ sido: "서울", sigungu: null }],
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-20",
  announcementDate: null,
  summary: "요약",
  url: "https://example.com",
  sources: [{ source: "demo", externalId: "1", url: null, raw: {}, fetchedAt: "2026-10-11T00:00:00.000Z" }],
});

class FakeRepo implements JobPostingRepository {
  constructor(private readonly store: ReturnType<typeof createJobPosting>[]) {}
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

describe("GetJobPostingDetail", () => {
  it("없는 id 는 null", async () => {
    const uc = new GetJobPostingDetail(new FakeRepo([]), clock);
    await expect(uc.execute("missing")).resolves.toBeNull();
  });

  it("있으면 program·status 를 돌려준다", async () => {
    const scheme = createJobPosting(draft());
    const uc = new GetJobPostingDetail(new FakeRepo([scheme]), clock);
    const item = await uc.execute(scheme.id);
    expect(item?.program.id).toBe(scheme.id);
    expect(item?.status).toBe("open");
  });
});
