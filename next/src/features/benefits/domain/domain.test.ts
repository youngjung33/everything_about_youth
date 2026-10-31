import { describe, expect, it } from "vitest";
import { parseCategoryId } from "./enums";
import { createProgram, isSameProgram, mergeProgram } from "./identity";
import { getProgramStatus, type BenefitProgramDraft } from "./program";

const baseDraft = (over: Partial<BenefitProgramDraft> = {}): BenefitProgramDraft => ({
  title: "2026 청년 월세 지원",
  organization: "서울시",
  categoryId: "housing",
  tags: ["월세"],
  regions: [{ sido: "서울", sigungu: "마포구" }],
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-20",
  announcementDate: null,
  summary: null,
  url: "https://example.com/a",
  sources: [{ source: "ontong", externalId: "1", url: null, raw: {}, fetchedAt: "2026-10-12T00:00:00Z" }],
  ...over,
});

describe("enums", () => {
  it("분야 텍스트를 파싱한다", () => {
    expect(parseCategoryId("주거")).toBe("housing");
    expect(parseCategoryId("일자리")).toBe("employment");
    expect(parseCategoryId("창업")).toBe("startup");
  });
});

describe("program", () => {
  it("접수 상태를 계산한다", () => {
    const p = { applicationStart: "2026-10-10", applicationEnd: "2026-10-20" };
    expect(getProgramStatus(p, "2026-10-09")).toBe("upcoming");
    expect(getProgramStatus(p, "2026-10-15")).toBe("open");
    expect(getProgramStatus(p, "2026-10-21")).toBe("closed");
  });
});

describe("identity", () => {
  it("id 는 b_ 로 시작한다", () => {
    const p = createProgram(baseDraft());
    expect(p.id.startsWith("b_")).toBe(true);
  });

  it("같은 정책은 mergeKey/id 가 같다", () => {
    const a = createProgram(baseDraft());
    const b = createProgram(baseDraft({ title: "[정정] 2026 청년 월세 지원" }));
    expect(a.id).toBe(b.id);
    expect(isSameProgram(a, b)).toBe(true);
  });

  it("병합 시 태그·지역·소스를 합친다", () => {
    const existing = createProgram(baseDraft({ tags: ["a"] }));
    const incoming = createProgram(baseDraft({ tags: ["b"], regions: [{ sido: "경기", sigungu: null }] }));
    const merged = mergeProgram(existing, incoming);
    expect(merged.id).toBe(existing.id);
    expect(merged.tags.sort()).toEqual(["a", "b"]);
    expect(merged.regions).toHaveLength(2);
  });
});
