import { describe, expect, it } from "vitest";
import { deadlineIcs, googleCalendarDeadlineUrl } from "./calendar";

describe("googleCalendarDeadlineUrl", () => {
  it("접수 마감일이 있으면 하루짜리 Google 캘린더 주소를 만든다 (끝 날짜는 다음날)", () => {
    const url = googleCalendarDeadlineUrl({
      title: "서울 행복주택",
      applicationEnd: "2026-10-20",
      url: "https://example.com/n",
    });
    expect(url).toContain("https://calendar.google.com/calendar/render?");
    const parsed = new URL(url!);
    expect(parsed.searchParams.get("action")).toBe("TEMPLATE");
    expect(parsed.searchParams.get("dates")).toBe("20261020/20261021");
    expect(parsed.searchParams.get("text")).toBe("접수 마감 · 서울 행복주택");
    expect(parsed.searchParams.get("details")).toContain("https://example.com/n");
  });

  it("마감일이 없거나 형식이 아니면 null", () => {
    expect(googleCalendarDeadlineUrl({ title: "x", applicationEnd: null, url: null })).toBeNull();
    expect(googleCalendarDeadlineUrl({ title: "x", applicationEnd: "10/20", url: null })).toBeNull();
  });
});

describe("deadlineIcs", () => {
  it("하루 종일 일정의 ICS 를 만든다", () => {
    const ics = deadlineIcs({
      noticeId: "abc;def",
      title: "서울, 행복주택",
      applicationEnd: "2026-10-20",
      url: "https://example.com/n",
      now: new Date("2026-10-12T03:00:00.000Z"),
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261020");
    expect(ics).toContain("DTEND;VALUE=DATE:20261021");
    expect(ics).toContain("SUMMARY:접수 마감 · 서울\\, 행복주택");
    expect(ics).toContain("UID:housing-abc\\;def-deadline@everythingaboutyouth");
    expect(ics).toContain("DTSTAMP:20261012T030000Z");
    expect(ics?.endsWith("\r\n")).toBe(true);
  });

  it("마감일이 없으면 null", () => {
    expect(deadlineIcs({ noticeId: "a", title: "t", applicationEnd: null, url: null, now: new Date() })).toBeNull();
  });
});
