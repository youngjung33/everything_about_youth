import { describe, expect, it } from "vitest";
import { evaluateEligibility } from "./eligibility/evaluate";
import { parseHousingType, parseSupplyType } from "./enums";
import { createNotice, isSameNotice, mergeNotice, normalizeOrganization } from "./identity";
import { getNoticeStatus, summarizeUnits, type NoticeDraft } from "./notice";

const baseDraft = (over: Partial<NoticeDraft> = {}): NoticeDraft => ({
  title: "2026년 청년 행복주택 입주자 모집",
  organization: "한국토지주택공사",
  supplyType: "happy_housing",
  housingTypes: ["apartment"],
  regions: [{ sido: "서울", sigungu: null }],
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-20",
  announcementDate: null,
  winnerAnnouncementDate: null,
  totalHouseholds: null,
  eligibilityText: null,
  url: "https://example.com/a",
  complexes: [],
  sources: [{ source: "lh", externalId: "1", url: null, raw: {}, fetchedAt: "2026-10-12T00:00:00Z" }],
  ...over,
});

describe("enums/region", () => {
  it("공급유형/주택유형을 파싱한다", () => {
    expect(parseSupplyType("행복주택")).toBe("happy_housing");
    expect(parseSupplyType("청년 매입임대")).toBe("youth_purchase_rental");
    expect(parseSupplyType("공공지원민간임대")).toBe("public_support_rental");
    expect(parseSupplyType("민간임대")).toBe("private_rental");
    expect(parseSupplyType("국민임대")).toBe("national_rental");
    expect(parseHousingType("오피스텔")).toBe("officetel");
    expect(parseHousingType("도시형생활주택")).toBe("urban_living");
  });
});

describe("notice", () => {
  it("접수 상태를 계산한다", () => {
    const n = { applicationStart: "2026-10-10", applicationEnd: "2026-10-20" };
    expect(getNoticeStatus(n, "2026-10-09")).toBe("upcoming");
    expect(getNoticeStatus(n, "2026-10-10")).toBe("open");
    expect(getNoticeStatus(n, "2026-10-20")).toBe("open");
    expect(getNoticeStatus(n, "2026-10-21")).toBe("closed");
    expect(getNoticeStatus({ applicationStart: null, applicationEnd: null }, "2026-10-21")).toBe("open");
  });
  it("가격/면적 요약", () => {
    const s = summarizeUnits({
      complexes: [
        {
          name: null,
          address: null,
          region: null,
          housingType: "apartment",
          households: null,
          units: [
            { name: null, exclusiveAreaM2: 26, households: 1, deposit: 5000000, monthlyRent: 100000 },
            { name: null, exclusiveAreaM2: 36, households: 1, deposit: 9000000, monthlyRent: null },
          ],
        },
      ],
    });
    expect(s).toEqual({ minDeposit: 5000000, minMonthlyRent: 100000, minAreaM2: 26, maxAreaM2: 36 });
  });
});

describe("identity", () => {
  it("기관명을 정규화한다", () => {
    expect(normalizeOrganization("한국토지주택공사")).toBe("lh");
    expect(normalizeOrganization("LH")).toBe("lh");
    expect(normalizeOrganization("서울주택도시공사")).toBe("sh");
  });
  it("같은 공고는 같은 id/mergeKey를 가진다 (정정 표기 무시)", () => {
    const a = createNotice(baseDraft());
    const b = createNotice(baseDraft({ title: "[정정] 2026년 청년 행복주택 입주자 모집", organization: "LH" }));
    expect(a.mergeKey).toBe(b.mergeKey);
    expect(a.id).toBe(b.id);
    expect(isSameNotice(a, b)).toBe(true);
  });
  it("다른 공고는 구분한다", () => {
    const a = createNotice(baseDraft());
    const b = createNotice(baseDraft({ title: "다른 공고", sources: [{ source: "sh", externalId: "9", url: null, raw: {}, fetchedAt: "" }] }));
    expect(isSameNotice(a, b)).toBe(false);
  });
  it("병합 시 소스를 합치고 기존 id를 유지한다", () => {
    const a = createNotice(baseDraft());
    const b = createNotice(
      baseDraft({
        url: "https://example.com/b",
        winnerAnnouncementDate: "2026-11-01",
        housingTypes: ["officetel"],
        sources: [{ source: "myhome", externalId: "m1", url: null, raw: {}, fetchedAt: "" }],
      }),
    );
    const merged = mergeNotice(a, b);
    expect(merged.id).toBe(a.id);
    expect(merged.url).toBe("https://example.com/a");
    expect(merged.winnerAnnouncementDate).toBe("2026-11-01");
    expect(merged.housingTypes.sort()).toEqual(["apartment", "officetel"]);
    expect(merged.sources.map((s) => s.source).sort()).toEqual(["lh", "myhome"]);
  });
});

describe("evaluateEligibility", () => {
  const today = "2026-10-12";
  const open = { applicationStart: "2026-10-01", applicationEnd: "2026-10-20" };

  it("마감된 공고는 불가", () => {
    const r = evaluateEligibility({ supplyType: "happy_housing", applicationStart: null, applicationEnd: "2026-10-01" }, { age: 30 }, today);
    expect(r.verdict).toBe("ineligible");
  });
  it("조건이 비어 있으면 확인 필요", () => {
    expect(evaluateEligibility({ supplyType: "happy_housing", ...open }, {}, today).verdict).toBe("check");
  });
  it("청년매입임대: 연령 초과는 불가", () => {
    const r = evaluateEligibility(
      { supplyType: "youth_purchase_rental", ...open },
      { age: 45, isHomeless: true, isMarried: false, incomeRatioPercent: 50 },
      today,
    );
    expect(r.verdict).toBe("ineligible");
    expect(r.reasons.join(" ")).toContain("연령");
  });
  it("청년매입임대: 모두 충족하면 가능", () => {
    const r = evaluateEligibility(
      { supplyType: "youth_purchase_rental", ...open },
      { age: 28, isHomeless: true, isMarried: false, incomeRatioPercent: 60 },
      today,
    );
    expect(r.verdict).toBe("eligible");
  });
  it("행복주택: 청년이면 소득 100% 이하 가능, 초과는 불가", () => {
    const base = { age: 30, isHomeless: true };
    expect(evaluateEligibility({ supplyType: "happy_housing", ...open }, { ...base, incomeRatioPercent: 90 }, today).verdict).toBe("eligible");
    expect(evaluateEligibility({ supplyType: "happy_housing", ...open }, { ...base, incomeRatioPercent: 110 }, today).verdict).toBe("ineligible");
  });
  it("행복주택: 연령 초과여도 신혼부부면 대상, 신혼 소득 120%까지", () => {
    const r = evaluateEligibility(
      { supplyType: "happy_housing", ...open },
      { age: 42, isHomeless: true, isNewlywed: true, incomeRatioPercent: 115 },
      today,
    );
    expect(r.verdict).toBe("eligible");
  });
  it("입력이 부족하면 확인 필요", () => {
    const r = evaluateEligibility({ supplyType: "national_rental", ...open }, { age: 30 }, today);
    expect(r.verdict).toBe("check");
  });
  it("유주택자는 무주택 요건 불가", () => {
    const r = evaluateEligibility({ supplyType: "national_rental", ...open }, { isHomeless: false, incomeRatioPercent: 40 }, today);
    expect(r.verdict).toBe("ineligible");
  });
  it("공급유형 other는 항상 확인 필요", () => {
    expect(evaluateEligibility({ supplyType: "other", ...open }, { age: 30 }, today).verdict).toBe("check");
  });
});
