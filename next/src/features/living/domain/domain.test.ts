import { describe, expect, it } from "vitest";
import { inferProcedureTypeFromText } from "./enums";
import { createGuide, isSameGuide, mergeGuide } from "./identity";
import { getGuideStatus, type LivingGuideDraft } from "./guide";

const baseDraft = (over: Partial<LivingGuideDraft> = {}): LivingGuideDraft => ({
  title: "전입신고 안내",
  organization: "행정안전부",
  procedureTypeId: "move_in",
  tags: ["전입"],
  regions: [{ sido: "서울", sigungu: "마포구" }],
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-20",
  announcementDate: null,
  summary: null,
  checklistSteps: [{ order: 1, title: "서류", summary: "계약서", url: null }],
  url: "https://example.com/a",
  sources: [{ source: "curated", externalId: "move-in-1", url: null, raw: {}, fetchedAt: "2026-10-12T00:00:00Z" }],
  ...over,
});

describe("enums", () => {
  it("제목·키워드에서 procedureTypeId 를 추론한다", () => {
    expect(inferProcedureTypeFromText("전입신고")).toBe("move_in");
    expect(inferProcedureTypeFromText("확정일자")).toBe("lease");
    expect(inferProcedureTypeFromText("전기요금")).toBe("utilities");
  });
});

describe("guide status", () => {
  it("접수 상태를 계산한다", () => {
    const p = { applicationStart: "2026-10-10", applicationEnd: "2026-10-20" };
    expect(getGuideStatus(p, "2026-10-09")).toBe("upcoming");
    expect(getGuideStatus(p, "2026-10-15")).toBe("open");
    expect(getGuideStatus(p, "2026-10-21")).toBe("closed");
  });

  it("날짜가 없으면 open", () => {
    expect(getGuideStatus({ applicationStart: null, applicationEnd: null }, "2026-10-15")).toBe("open");
  });
});

describe("identity", () => {
  it("id 는 l_ 로 시작한다", () => {
    const p = createGuide(baseDraft());
    expect(p.id.startsWith("l_")).toBe(true);
  });

  it("같은 소스·externalId 는 mergeKey/id 가 같다", () => {
    const a = createGuide(baseDraft());
    const b = createGuide(baseDraft({ title: "제목만 다른 동일 catalog" }));
    expect(a.id).toBe(b.id);
    expect(isSameGuide(a, b)).toBe(true);
  });

  it("병합 시 태그·지역·소스·checklistSteps 를 합친다", () => {
    const existing = createGuide(baseDraft({ tags: ["a"] }));
    const incoming = createGuide(
      baseDraft({
        tags: ["b"],
        regions: [{ sido: "경기", sigungu: null }],
        checklistSteps: [{ order: 1, title: "새 단계", summary: "본문", url: null }],
      }),
    );
    const merged = mergeGuide(existing, incoming);
    expect(merged.id).toBe(existing.id);
    expect(merged.tags.sort()).toEqual(["a", "b"]);
    expect(merged.regions).toHaveLength(2);
    expect(merged.checklistSteps[0]!.title).toBe("새 단계");
  });
});
