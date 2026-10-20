import type { IsoDate } from "@/common/domain/date";

/** 원 → "4억 7,550만원", "500만원", "12만원" */
export function formatWon(won: number | null | undefined): string {
  if (won === null || won === undefined) return "-";
  if (won === 0) return "0원";
  // 1만원 미만은 반올림하지 않고 그대로 보여준다. (5,000원이 "1만원"이 되면 안 된다)
  if (Math.abs(won) < 10_000) return `${won.toLocaleString("ko-KR")}원`;
  // 만원 단위로 먼저 반올림한 뒤 억/만을 나눠야 "10,000만원" 같은 표기가 생기지 않는다.
  const totalMan = Math.round(won / 10_000);
  const eok = Math.floor(totalMan / 10_000);
  const man = totalMan % 10_000;
  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok.toLocaleString("ko-KR")}억`);
  if (man > 0) parts.push(`${man.toLocaleString("ko-KR")}만`);
  return `${parts.join(" ")}원`;
}

export function formatRange<T>(min: T | null, max: T | null, fmt: (v: T) => string): string {
  if (min === null && max === null) return "-";
  if (min === null || max === null || min === max) return fmt((min ?? max) as T);
  return `${fmt(min)} ~ ${fmt(max)}`;
}

export function formatArea(m2: number | null): string {
  return m2 === null ? "-" : `${Number.isInteger(m2) ? m2 : m2.toFixed(2).replace(/\.?0+$/, "")}㎡`;
}

export function formatDate(date: IsoDate | null): string {
  return date ? date.replaceAll("-", ".") : "-";
}

export function formatPeriod(start: IsoDate | null, end: IsoDate | null): string {
  if (!start && !end) return "일정 미정/상시";
  if (start && end && start === end) return formatDate(start);
  if (!start) return `~ ${formatDate(end)}`;
  if (!end) return `${formatDate(start)} ~`;
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

function dayDiff(from: IsoDate, to: IsoDate): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** 마감/시작까지 남은 일수 라벨 */
export function formatDday(start: IsoDate | null, end: IsoDate | null, today: IsoDate): string | null {
  if (end && end < today) return "마감";
  if (start && start > today) return `D-${dayDiff(today, start)} 시작`;
  if (!end) return null;
  const d = dayDiff(today, end);
  return d === 0 ? "오늘 마감" : `D-${d}`;
}
