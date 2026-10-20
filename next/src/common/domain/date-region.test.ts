import { describe, expect, it } from "vitest";
import { parseDateRange, parseIsoDate, todayInKst } from "./date";
import { parseRegionFromAddress, parseSido, sidoFromCode } from "./region";

describe("date", () => {
  it("다양한 날짜 형식을 정규화한다", () => {
    expect(parseIsoDate("20261012")).toBe("2026-10-12");
    expect(parseIsoDate("2026.10.2")).toBe("2026-10-02");
    expect(parseIsoDate("2026년 10월 2일")).toBe("2026-10-02");
    expect(parseIsoDate("2026-10-12 10:00")).toBe("2026-10-12");
    expect(parseIsoDate("2026-02-31")).toBeNull();
    expect(parseIsoDate("")).toBeNull();
  });
  it("기간 텍스트를 파싱한다", () => {
    expect(parseDateRange("2026.10.01 ~ 2026.10.20")).toEqual({ start: "2026-10-01", end: "2026-10-20" });
    expect(parseDateRange("2026.10.01")).toEqual({ start: "2026-10-01", end: null });
  });
  it("KST 기준 오늘을 계산한다", () => {
    expect(todayInKst(new Date("2026-10-12T16:00:00Z"))).toBe("2026-10-13");
  });
});

describe("region", () => {
  it("시도를 파싱한다", () => {
    expect(parseSido("서울특별시")).toBe("서울");
    expect(parseSido("경기도 수원시 영통구")).toBe("경기");
    expect(sidoFromCode("11110")).toBe("서울");
    expect(parseRegionFromAddress("충청남도 천안시 서북구 불당동")).toEqual({ sido: "충남", sigungu: "천안시" });
  });
});
