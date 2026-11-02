import { describe, expect, it } from "vitest";
import { parseSearchParams } from "./search-params";

describe("parseSearchParams (finance)", () => {
  it("알 수 없는 category·status 는 무시한다", () => {
    const parsed = parseSearchParams({ category: "bogus", status: "nope", page: "0" });
    expect(parsed.filters.productTypeIds).toBeUndefined();
    expect(parsed.filters.statuses).toBeUndefined();
    expect(parsed.page).toBe(1);
  });

  it("비정상 age·household 는 profile 에 넣지 않는다", () => {
    const parsed = parseSearchParams({ age: "abc", household: "99" });
    expect(parsed.profile.age).toBeUndefined();
    expect(parsed.profile.householdSize).toBeUndefined();
    expect(parsed.hasProfile).toBe(false);
  });

  it("유효한 필터·page 를 파싱한다", () => {
    const parsed = parseSearchParams({ category: "jeonse_loan", page: "2", sort: "latest" });
    expect(parsed.filters.productTypeIds).toEqual(["jeonse_loan"]);
    expect(parsed.page).toBe(2);
    expect(parsed.sort).toBe("latest");
  });
});
