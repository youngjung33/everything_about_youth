import { describe, expect, it } from "vitest";
import { inferProductTypeFromText } from "./enums";
import { createScheme, isSameScheme, mergeScheme } from "./identity";
import { getSchemeStatus, type FinanceSchemeDraft } from "./scheme";

const baseDraft = (over: Partial<FinanceSchemeDraft> = {}): FinanceSchemeDraft => ({
  title: "청년 전세자금 대출",
  organization: "한국주택금융공사",
  productTypeId: "jeonse_loan",
  tags: ["전세"],
  regions: [{ sido: "서울", sigungu: "마포구" }],
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-20",
  announcementDate: null,
  summary: null,
  url: "https://example.com/a",
  sources: [{ source: "curated", externalId: "hf-youth-jeonse", url: null, raw: {}, fetchedAt: "2026-10-12T00:00:00Z" }],
  ...over,
});

describe("enums", () => {
  it("제목·키워드에서 productTypeId 를 추론한다", () => {
    expect(inferProductTypeFromText("전세자금")).toBe("jeonse_loan");
    expect(inferProductTypeFromText("임대보증금")).toBe("lease_deposit");
    expect(inferProductTypeFromText("청약저축")).toBe("housing_savings");
  });
});

describe("scheme status", () => {
  it("접수 상태를 계산한다", () => {
    const p = { applicationStart: "2026-10-10", applicationEnd: "2026-10-20" };
    expect(getSchemeStatus(p, "2026-10-09")).toBe("upcoming");
    expect(getSchemeStatus(p, "2026-10-15")).toBe("open");
    expect(getSchemeStatus(p, "2026-10-21")).toBe("closed");
  });
});

describe("identity", () => {
  it("id 는 f_ 로 시작한다", () => {
    const p = createScheme(baseDraft());
    expect(p.id.startsWith("f_")).toBe(true);
  });

  it("같은 소스·externalId 는 mergeKey/id 가 같다", () => {
    const a = createScheme(baseDraft());
    const b = createScheme(baseDraft({ title: "제목만 다른 동일 catalog" }));
    expect(a.id).toBe(b.id);
    expect(isSameScheme(a, b)).toBe(true);
  });

  it("병합 시 태그·지역·소스를 합친다", () => {
    const existing = createScheme(baseDraft({ tags: ["a"] }));
    const incoming = createScheme(baseDraft({ tags: ["b"], regions: [{ sido: "경기", sigungu: null }] }));
    const merged = mergeScheme(existing, incoming);
    expect(merged.id).toBe(existing.id);
    expect(merged.tags.sort()).toEqual(["a", "b"]);
    expect(merged.regions).toHaveLength(2);
  });
});
