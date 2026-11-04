import { describe, expect, it, vi } from "vitest";
import { OntongSource } from "./ontong-source";

describe("OntongSource", () => {
  it("BENEFITS_ONTONG_API_KEY 없으면 사용 불가", () => {
    const source = new OntongSource({});
    expect(source.checkAvailability().available).toBe(false);
  });

  it("짧은 목록 row 에 대해 상세 API 로 summary 를 보강한다", async () => {
    const getText = vi.fn(async (url: string) => {
      if (url.includes("pageIndex=1") && !url.includes("srchPolicyId")) {
        return `<?xml version="1.0"?><response><youthPlcy><item><plcyId>P1</plcyId><plcyNm>테스트</plcyNm><plcyExplnCn>짧음</plcyExplnCn></item></youthPlcy></response>`;
      }
      if (url.includes("srchPolicyId=P1")) {
        return `<?xml version="1.0"?><response><youthPlcy><item><plcyId>P1</plcyId><aplyMthdCn>방문 신청</aplyMthdCn></item></youthPlcy></response>`;
      }
      return `<?xml version="1.0"?><response></response>`;
    });

    const drafts = await new OntongSource({ apiKey: "k", getText, delayMs: 0 }).fetchPrograms({
      fetchedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.summary).toContain("짧음");
    expect(drafts[0]?.summary).toContain("방문 신청");
  });
});
