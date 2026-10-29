import { describe, expect, it } from "vitest";
import { parseSourceList } from "./sync-sources";

describe("parseSourceList", () => {
  it("undefined·빈 문자열이면 빈 배열", () => {
    expect(parseSourceList(undefined)).toEqual([]);
    expect(parseSourceList("")).toEqual([]);
    expect(parseSourceList("  ,  ")).toEqual([]);
  });

  it("콤마 구분·공백·대소문자를 정규화한다", () => {
    expect(parseSourceList(" LH , sh ")).toEqual(["lh", "sh"]);
    expect(parseSourceList("MyHome,APPLYHOME")).toEqual(["myhome", "applyhome"]);
  });

  it("모든 SOURCE_IDS 를 받는다", () => {
    expect(parseSourceList("lh,myhome,applyhome,sh,gh,ih,demo")).toHaveLength(7);
  });

  it("알 수 없는 소스면 Error", () => {
    expect(() => parseSourceList("lh,unknown")).toThrow(/알 수 없는 소스/);
    expect(() => parseSourceList("bogus")).toThrow(/사용 가능/);
  });
});
