import { describe, expect, it } from "vitest";
import { buildOntongSummaryText, needsOntongDetailEnrichment, needsOntongSummaryEnrichment } from "./ontong-summary";

describe("needsOntongSummaryEnrichment", () => {
  it("null·공백·짧은 문자열이면 true", () => {
    expect(needsOntongSummaryEnrichment(null)).toBe(true);
    expect(needsOntongSummaryEnrichment("   ")).toBe(true);
    expect(needsOntongSummaryEnrichment("짧은")).toBe(true);
  });

  it("충분히 긴 요약이면 false", () => {
    expect(needsOntongSummaryEnrichment("가".repeat(80))).toBe(false);
  });
});

describe("needsOntongDetailEnrichment", () => {
  it("자격·신청 필드가 없고 본문이 짧으면 true", () => {
    expect(needsOntongDetailEnrichment({ plcyId: "1", plcyExplnCn: "가".repeat(100) })).toBe(true);
  });

  it("충분한 본문과 자격 또는 신청 필드가 있으면 false", () => {
    expect(
      needsOntongDetailEnrichment({
        plcyId: "1",
        plcyExplnCn: "가".repeat(100),
        aplyMthdCn: "온라인 신청",
      }),
    ).toBe(false);
  });
});

describe("buildOntongSummaryText", () => {
  it("설명·자격·신청·지원 필드를 이어 붙인다", () => {
    const text = buildOntongSummaryText(
      {
        plcyExplnCn: "정책 개요",
        sprtQlfcCn: "지원 자격",
        aplyMthdCn: "신청 방법",
      },
      null,
    );
    expect(text).toContain("정책 개요");
    expect(text).toContain("지원 자격");
    expect(text).toContain("신청 방법");
  });

  it("기존 요약과 중복되면 한 번만 넣는다", () => {
    const text = buildOntongSummaryText({ plcyExplnCn: "동일" }, "동일");
    expect(text).toBe("동일");
  });
});
