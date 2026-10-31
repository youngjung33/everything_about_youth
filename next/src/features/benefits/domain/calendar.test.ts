import { describe, expect, it } from "vitest";
import { deadlineIcs, googleCalendarDeadlineUrl } from "./calendar";

describe("googleCalendarDeadlineUrl", () => {
  it("마감일이 있으면 Google 캘린더 URL", () => {
    const url = googleCalendarDeadlineUrl({ title: "청년 월세", applicationEnd: "2026-10-20", url: "https://example.com" });
    expect(url).toContain("calendar.google.com");
    expect(new URL(url!).searchParams.get("dates")).toBe("20261020/20261021");
  });

  it("마감일 없으면 null", () => {
    expect(googleCalendarDeadlineUrl({ title: "x", applicationEnd: null, url: null })).toBeNull();
  });
});

describe("deadlineIcs", () => {
  it("benefits UID prefix", () => {
    const ics = deadlineIcs({
      programId: "b_abc",
      title: "정책",
      applicationEnd: "2026-10-20",
      url: null,
      now: new Date("2026-10-12T03:00:00.000Z"),
    });
    expect(ics).toContain("UID:benefits-b_abc-deadline@everythingaboutyouth");
  });
});
