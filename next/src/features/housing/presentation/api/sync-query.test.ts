import { describe, expect, it } from "vitest";
import { ApiError } from "@/common/presentation/api/errors";
import { sourcesFromSyncQuery } from "./sync-query";

describe("sourcesFromSyncQuery", () => {
  it("source 가 없으면 빈 배열", () => {
    expect(sourcesFromSyncQuery(new URLSearchParams())).toEqual([]);
  });

  it("유효한 source 목록을 파싱한다", () => {
    expect(sourcesFromSyncQuery(new URLSearchParams({ source: "lh,sh" }))).toEqual(["lh", "sh"]);
  });

  it("잘못된 source 는 BAD_REQUEST", () => {
    expect(() => sourcesFromSyncQuery(new URLSearchParams({ source: "nope" }))).toThrow(ApiError);
    try {
      sourcesFromSyncQuery(new URLSearchParams({ source: "nope" }));
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe("BAD_REQUEST");
    }
  });
});
