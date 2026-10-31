import { describe, expect, it } from "vitest";
import { mapOntongItem, mapOntongItems } from "./ontong-mapper";

describe("mapOntongItem", () => {
  it("필수 필드 없으면 null", () => {
    expect(mapOntongItem({}, { fetchedAt: "t", baseUrl: "https://x" })).toBeNull();
  });

  it("온통청년 레코드를 BenefitProgramDraft 로 변환", () => {
    const draft = mapOntongItem(
      {
        plcyId: "P100",
        plcyNm: "청년 취업 지원",
        sprvsnInstCdNm: "고용노동부",
        plcyLclsNm: "일자리",
        plcyKywdNm: "취업,청년",
        aplyBgngYmd: "20260101",
        aplyEndYmd: "20261231",
        plcyExplnCn: "설명",
      },
      { fetchedAt: "2026-10-12T00:00:00Z", baseUrl: "https://www.youthcenter.go.kr" },
    );
    expect(draft).toMatchObject({
      title: "청년 취업 지원",
      organization: "고용노동부",
      categoryId: "employment",
      tags: ["취업", "청년"],
      applicationStart: "2026-01-01",
      applicationEnd: "2026-12-31",
      sources: [{ source: "ontong", externalId: "P100" }],
    });
  });
});

describe("mapOntongItems", () => {
  it("여러 건을 변환하고 null 은 건너뛴다", () => {
    const list = mapOntongItems([{ plcyId: "1", plcyNm: "A" }, {}], { fetchedAt: "t" });
    expect(list).toHaveLength(1);
  });
});
