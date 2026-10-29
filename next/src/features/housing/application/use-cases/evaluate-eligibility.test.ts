import { describe, expect, it } from "vitest";
import type { Clock } from "@/common/application/system";
import { createNotice } from "@/features/housing/domain/identity";
import type { NoticeDraft } from "@/features/housing/domain/notice";
import { EvaluateEligibility } from "./evaluate-eligibility";

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

describe("EvaluateEligibility (application)", () => {
  const uc = new EvaluateEligibility(clock);
  const notice = createNotice(draft());

  it("오늘(KST) 기준으로 domain evaluate 를 호출한다", () => {
    const r = uc.execute(notice, { age: 30, isHomeless: true });
    expect(r.verdict).toBe("check");
  });

  it("마감 공고는 ineligible", () => {
    const closed = createNotice(draft({ applicationEnd: "2026-10-01" }));
    expect(uc.execute(closed, { age: 25, isHomeless: true }).verdict).toBe("ineligible");
  });
});
