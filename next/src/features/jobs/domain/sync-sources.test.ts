import { describe, expect, it } from "vitest";
import { parseSourceList } from "./sync-sources";

describe("parseSourceList", () => {
  it("undefined·빈 문자열이면 빈 배열", () => {
    expect(parseSourceList(undefined)).toEqual([]);
    expect(parseSourceList("")).toEqual([]);
  });

  it("curated·demo 를 받는다", () => {
    expect(parseSourceList("curated,demo")).toEqual(["curated", "demo"]);
  });

  it("알 수 없는 소스면 Error", () => {
    expect(() => parseSourceList("lh")).toThrow(/알 수 없는 소스/);
  });
});
