import { describe, expect, it } from "vitest";
import { parseSourceList } from "./sync-sources";

describe("parseSourceList", () => {
  it("undefined·빈 문자열이면 빈 배열", () => {
    expect(parseSourceList(undefined)).toEqual([]);
    expect(parseSourceList("")).toEqual([]);
  });

  it("중복 소스는 한 번만", () => {
    expect(parseSourceList("curated,curated")).toEqual(["curated"]);
  });

  it("알 수 없는 소스면 Error", () => {
    expect(() => parseSourceList("lh")).toThrow(/알 수 없는 소스/);
  });
});
