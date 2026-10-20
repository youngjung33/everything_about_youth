/** 날짜는 모두 "YYYY-MM-DD" 문자열(한국 기준 달력일)로 다룬다. */
export type IsoDate = string;

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function todayInKst(now: Date): IsoDate {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * "20260301", "2026.03.01", "2026-3-1", "2026년 3월 1일", "2026-03-01 10:00" 등을 정규화한다.
 * 해석할 수 없으면 null.
 */
export function parseIsoDate(value: string | number | null | undefined): IsoDate | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})(\d{2})(\d{2})(?:\D|$)/);
  if (!m) m = s.match(/(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 텍스트에서 "A ~ B" 형태의 기간을 추출한다. */
export function parseDateRange(text: string | null | undefined): { start: IsoDate | null; end: IsoDate | null } {
  const s = text ?? "";
  const matches = [...s.matchAll(/\d{4}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2}|\d{8}/g)].map((m) =>
    parseIsoDate(m[0]),
  );
  const dates = matches.filter((d): d is IsoDate => d !== null);
  return { start: dates[0] ?? null, end: dates.length > 1 ? (dates[dates.length - 1] ?? null) : null };
}
