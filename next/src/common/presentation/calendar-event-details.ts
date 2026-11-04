const MAX_SUMMARY_CHARS = 500;

/** 캘린더 일정 본문: 수집 요약 + 검증용 URL */
export function buildCalendarEventDetails(summary: string | null | undefined, url: string | null): string {
  const parts: string[] = [];
  const text = summary?.trim();
  if (text) {
    parts.push(text.length > MAX_SUMMARY_CHARS ? `${text.slice(0, MAX_SUMMARY_CHARS - 1)}…` : text);
  }
  if (url) parts.push(`검증용 링크: ${url}`);
  return parts.join("\n\n");
}
