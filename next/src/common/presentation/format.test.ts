import { describe, expect, it } from "vitest";
import { formatArea, formatDday, formatPeriod, formatRange, formatWon } from "./format";

describe("format", () => {
  it("금액", () => {
    expect(formatWon(475_500_000)).toBe("4억 7,550만원");
    expect(formatWon(5_000_000)).toBe("500만원");
    expect(formatWon(100_000_000)).toBe("1억원");
    expect(formatWon(150_000)).toBe("15만원");
    expect(formatWon(null)).toBe("-");
  });
  it("금액: 1만원 미만은 반올림하지 않고, 경계에서 '10,000만'이 생기지 않는다", () => {
    expect(formatWon(5_000)).toBe("5,000원");
    expect(formatWon(9_999)).toBe("9,999원");
    expect(formatWon(10_000)).toBe("1만원");
    expect(formatWon(99_995_000)).toBe("1억원");
  });
  it("범위/면적/기간", () => {
    expect(formatRange(1, 3, (v) => `${v}x`)).toBe("1x ~ 3x");
    expect(formatRange(2, 2, (v) => `${v}x`)).toBe("2x");
    expect(formatRange<number>(null, null, String)).toBe("-");
    expect(formatArea(26.5)).toBe("26.5㎡");
    expect(formatArea(36)).toBe("36㎡");
    expect(formatPeriod("2026-10-01", "2026-10-20")).toBe("2026.10.01 ~ 2026.10.20");
    expect(formatPeriod(null, null)).toBe("일정 미정/상시");
  });
  it("D-day", () => {
    expect(formatDday("2026-10-01", "2026-10-15", "2026-10-12")).toBe("D-3");
    expect(formatDday("2026-10-01", "2026-10-12", "2026-10-12")).toBe("오늘 마감");
    expect(formatDday("2026-10-20", "2026-10-25", "2026-10-12")).toBe("D-8 시작");
    expect(formatDday("2026-10-01", "2026-10-05", "2026-10-12")).toBe("마감");
    expect(formatDday(null, null, "2026-10-12")).toBeNull();
  });
});
