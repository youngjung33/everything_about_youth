import { describe, expect, it } from "vitest";
import { compareAppVersions, formatAppVersion, parseAppVersion } from "./app-version";

describe("parseAppVersion", () => {
  it("1.2.3 형식을 읽는다 (빌드 번호와 꼬리는 무시)", () => {
    expect(parseAppVersion("1.2.3")).toEqual([1, 2, 3]);
    expect(parseAppVersion(" 1.2.3+45 ")).toEqual([1, 2, 3]);
    expect(parseAppVersion("1.2.3-beta.1")).toEqual([1, 2, 3]);
    expect(parseAppVersion("1.2")).toEqual([1, 2, 0]);
  });

  it("형식이 아니면 null", () => {
    for (const bad of [null, undefined, "", "abc", "1", "1.x.3", "v1.2.3", "1.2.3.4", "-1.0.0", "1..2"]) {
      expect(parseAppVersion(bad as string | null | undefined), String(bad)).toBeNull();
    }
  });
});

describe("compareAppVersions", () => {
  const v = (s: string) => parseAppVersion(s)!;

  it("숫자로 비교한다 (문자열 비교가 아니다)", () => {
    expect(compareAppVersions(v("1.10.0"), v("1.9.0"))).toBeGreaterThan(0);
    expect(compareAppVersions(v("1.0.9"), v("1.0.10"))).toBeLessThan(0);
    expect(compareAppVersions(v("2.0.0"), v("1.99.99"))).toBeGreaterThan(0);
    expect(compareAppVersions(v("1.2.3"), v("1.2.3+9"))).toBe(0);
  });

  it("formatAppVersion 은 되돌린다", () => {
    expect(formatAppVersion(v("1.2"))).toBe("1.2.0");
  });
});
