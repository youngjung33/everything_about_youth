import { describe, expect, it, vi } from "vitest";
import { enrichOntongListRows, fetchOntongPolicyDetailRecord } from "./ontong-detail-fetch";

describe("fetchOntongPolicyDetailRecord", () => {
  it("getText 가 throw 하면 null", async () => {
    const result = await fetchOntongPolicyDetailRecord("P1", {
      apiKey: "k",
      getText: async () => {
        throw new Error("network");
      },
      signal: new AbortController().signal,
    });
    expect(result).toBeNull();
  });

  it("srchPolicyId 목록 응답에서 item 을 반환", async () => {
    const xml = `<?xml version="1.0"?><response><youthPlcy><item><plcyId>P9</plcyId><plcyExplnCn>상세설명</plcyExplnCn></item></youthPlcy></response>`;
    const getText = vi.fn(async () => xml);
    const result = await fetchOntongPolicyDetailRecord("P9", {
      apiKey: "k",
      getText,
      signal: new AbortController().signal,
    });
    expect(result).toMatchObject({ plcyId: "P9", plcyExplnCn: "상세설명" });
  });
});

describe("enrichOntongListRows", () => {
  it("본문·자격·신청이 충분하면 추가 호출 없이 그대로", async () => {
    const getText = vi.fn(async () => {
      throw new Error("should not call");
    });
    const row = {
      plcyId: "1",
      plcyExplnCn: "가".repeat(100),
      aplyMthdCn: "온라인",
      sprtQlfcCn: "만 19세 이상",
    };
    const out = await enrichOntongListRows([row], {
      apiKey: "k",
      getText,
      signal: new AbortController().signal,
      delayMs: 0,
    });
    expect(out).toEqual([row]);
    expect(getText).not.toHaveBeenCalled();
  });

  it("짧은 요약이면 상세를 합친 plcyExplnCn 을 넣는다", async () => {
    const getText = vi.fn(async (url: string) => {
      if (url.includes("srchPolicyId=P2")) {
        return `<?xml version="1.0"?><response><youthPlcy><item><plcyId>P2</plcyId><aplyMthdCn>온라인 신청</aplyMthdCn></item></youthPlcy></response>`;
      }
      throw new Error("unexpected");
    });
    const out = await enrichOntongListRows([{ plcyId: "P2", plcyExplnCn: "짧음" }], {
      apiKey: "k",
      getText,
      signal: new AbortController().signal,
      delayMs: 0,
    });
    expect(out[0]?.plcyExplnCn).toContain("짧음");
    expect(out[0]?.plcyExplnCn).toContain("온라인 신청");
  });
});
