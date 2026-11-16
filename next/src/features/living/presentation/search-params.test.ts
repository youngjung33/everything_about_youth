import { describe, expect, it } from "vitest";
import { parseSearchParams } from "./search-params";

describe("parseSearchParams (living)", () => {
  it("알 수 없는 verdict·residence 는 무시한다", () => {
    const parsed = parseSearchParams({ v: "bogus", residence: "없는시" });
    expect(parsed.verdicts).toEqual([]);
    expect(parsed.profile.residenceSido).toBeUndefined();
    expect(parsed.hasProfile).toBe(false);
  });

  it("거주 시도·판정 필터를 파싱한다", () => {
    const parsed = parseSearchParams({ residence: "서울", v: "eligible", home: "y" });
    expect(parsed.profile.residenceSido).toBe("서울");
    expect(parsed.hasProfile).toBe(true);
    expect(parsed.verdicts).toEqual(["eligible"]);
    expect(parsed.profile.isHomeless).toBe(true);
  });

  it("알 수 없는 category·status 는 무시한다", () => {
    const parsed = parseSearchParams({ category: "bogus", status: "nope", page: "0" });
    expect(parsed.filters.procedureTypeIds).toBeUndefined();
    expect(parsed.filters.statuses).toBeUndefined();
    expect(parsed.page).toBe(1);
  });

  it("유효한 필터·page 를 파싱한다", () => {
    const parsed = parseSearchParams({ category: "move_in", page: "2", sort: "latest" });
    expect(parsed.filters.procedureTypeIds).toEqual(["move_in"]);
    expect(parsed.page).toBe(2);
    expect(parsed.sort).toBe("latest");
  });
});
