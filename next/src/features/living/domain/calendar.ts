/**
 * 정책 신청 마감일을 캘린더에 넣는 주소·파일.
 * Google 캘린더 하루짜리 일정은 끝 날짜가 다음날(배타)이다.
 */
import { buildCalendarEventDetails } from "@/common/domain/calendar-event-details";

export function googleCalendarDeadlineUrl(input: {
  title: string;
  applicationEnd: string | null;
  summary?: string | null;
  url: string | null;
}): string | null {
  const ymd = compactYmd(input.applicationEnd);
  if (!ymd) return null;
  const next = nextYmd(input.applicationEnd!);
  if (!next) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `신청 마감 · ${input.title}`,
    dates: `${ymd}/${next}`,
  });
  const details = buildCalendarEventDetails(input.summary, input.url);
  if (details) params.set("details", details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function deadlineIcs(input: {
  guideId: string;
  title: string;
  applicationEnd: string | null;
  summary?: string | null;
  url: string | null;
  now: Date;
}): string | null {
  const ymd = compactYmd(input.applicationEnd);
  if (!ymd) return null;
  const next = nextYmd(input.applicationEnd!);
  if (!next) return null;
  const stamp = compactStamp(input.now);
  const uid = `living-${icsEscape(input.guideId)}-deadline@everythingaboutyouth`;
  const summary = icsEscape(`신청 마감 · ${input.title}`);
  const description = buildCalendarEventDetails(input.summary, input.url);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//청년의 모든 것//청년혜택//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd}`,
    `DTEND;VALUE=DATE:${next}`,
    `SUMMARY:${summary}`,
    ...(description ? [`DESCRIPTION:${icsEscape(description)}`] : []),
    ...(input.url ? [`URL:${input.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

function compactYmd(isoDate: string | null): string | null {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  return isoDate.replaceAll("-", "");
}

function nextYmd(isoDate: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function compactStamp(now: Date): string {
  const iso = now.toISOString().replace(/[-:]/g, "");
  return `${iso.slice(0, 8)}T${iso.slice(9, 15)}Z`;
}

function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
