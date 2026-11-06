import { describe, expect, it } from "vitest";
import { parseSearchParams } from "./search-params";

describe("parseSearchParams (living)", () => {
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
