import { describe, expect, it } from "vitest";
import { evaluateEligibility } from "./evaluate";

const today = "2026-10-12";
const open = {
  applicationStart: "2026-10-01",
  applicationEnd: "2026-10-20",
  procedureTypeId: "move_in" as const,
  regions: [{ sido: "서울" as const, sigungu: null }],
};

describe("evaluateEligibility", () => {
  it("마감 안내는 ineligible", () => {
    const r = evaluateEligibility({ ...open, applicationEnd: "2026-10-01" }, { age: 25 }, today);
    expect(r.verdict).toBe("ineligible");
  });

  it("프로필 없으면 check", () => {
    expect(evaluateEligibility(open, {}, today).verdict).toBe("check");
  });

  it("other 유형은 check", () => {
    const r = evaluateEligibility({ ...open, procedureTypeId: "other" }, { age: 25 }, today);
    expect(r.verdict).toBe("check");
  });

  it("프로필 입력 시 참고 eligible", () => {
    const r = evaluateEligibility(open, { age: 28, residenceSido: "서울" }, today);
    expect(r.verdict).toBe("eligible");
  });
});
