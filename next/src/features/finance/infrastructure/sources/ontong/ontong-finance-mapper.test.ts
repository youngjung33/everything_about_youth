import { describe, expect, it } from "vitest";
import { mapOntongFinanceItem, mapOntongFinanceItems } from "./ontong-finance-mapper";

describe("mapOntongFinanceItem", () => {
  it("필수 필드 없으면 null", () => {
    expect(mapOntongFinanceItem({}, { fetchedAt: "t", baseUrl: "https://x" })).toBeNull();
  });

  it("금융·세금 분류가 아니면 null", () => {
    expect(
      mapOntongFinanceItem(
        { plcyId: "P1", plcyNm: "청년 취업", plcyLclsNm: "일자리" },
        { fetchedAt: "t", baseUrl: "https://x" },
      ),
    ).toBeNull();
  });

  it("금융 정책을 FinanceSchemeDraft 로 변환", () => {
    const draft = mapOntongFinanceItem(
      {
        plcyId: "P100",
        plcyNm: "청년 전세자금 대출",
        sprvsnInstCdNm: "한국주택금융공사",
        plcyLclsNm: "금융",
        plcyKywdNm: "전세,대출",
        aplyBgngYmd: "20260101",
        aplyEndYmd: "20261231",
        plcyExplnCn: "설명",
      },
      { fetchedAt: "2026-10-12T00:00:00Z", baseUrl: "https://www.youthcenter.go.kr" },
    );
    expect(draft).toMatchObject({
      title: "청년 전세자금 대출",
      organization: "한국주택금융공사",
      productTypeId: "jeonse_loan",
      tags: ["전세", "대출"],
      applicationStart: "2026-01-01",
      applicationEnd: "2026-12-31",
      sources: [{ source: "ontong-finance", externalId: "P100" }],
    });
  });
});

describe("mapOntongFinanceItems", () => {
  it("여러 건을 변환하고 null 은 건너뛴다", () => {
    const list = mapOntongFinanceItems(
      [
        { plcyId: "1", plcyNm: "청년 대출", plcyLclsNm: "금융" },
        { plcyId: "2", plcyNm: "취업", plcyLclsNm: "일자리" },
        {},
      ],
      { fetchedAt: "t" },
    );
    expect(list).toHaveLength(1);
  });
});
