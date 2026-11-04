import { describe, expect, it } from "vitest";
import { buildCalendarEventDetails } from "./calendar-event-details";

describe("buildCalendarEventDetails", () => {
  it("요약과 URL 이 없으면 빈 문자열", () => {
    expect(buildCalendarEventDetails(null, null)).toBe("");
  });

  it("요약을 먼저 넣고 URL 을 뒤에 붙인다", () => {
    const text = buildCalendarEventDetails("정책 설명", "https://example.com");
    expect(text).toContain("정책 설명");
    expect(text).toContain("검증용 링크: https://example.com");
  });

  it("긴 요약은 잘린다", () => {
    const long = "가".repeat(600);
    expect(buildCalendarEventDetails(long, null).length).toBeLessThanOrEqual(500);
  });
});
