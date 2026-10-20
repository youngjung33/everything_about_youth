import { parseIsoDate, type IsoDate } from "@/common/domain/date";

const FULL_DATE = /(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/;
const PARTIAL_DATE = /(\d{1,2})\s*[.월/]\s*(\d{1,2})/;
const DAY_ONLY = /(\d{1,2})\s*일/;

const PERIOD_LABELS = ["접수기간", "신청기간", "접수 기간", "신청 기간", "청약접수", "접수일정", "접수 일정", "모집기간", "접수일"];

export function compactText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** 본문에서 "접수기간 : 2026. 10. 26.(월) ~ 2026.11. 06.(금)" 같은 접수 기간을 추출한다. */
export function extractApplicationPeriod(text: string): { start: IsoDate | null; end: IsoDate | null } {
  const body = compactText(text);
  for (const label of PERIOD_LABELS) {
    const idx = body.indexOf(label);
    if (idx < 0) continue;
    const segment = body.slice(idx + label.length, idx + label.length + 220);
    const m1 = segment.match(FULL_DATE);
    if (!m1 || m1.index === undefined || m1.index > 40) continue;
    const start = parseIsoDate(m1[0]);
    if (!start) continue;

    const rest = segment.slice(m1.index + m1[0].length);
    const sep = rest.slice(0, 40).search(/[~∼～]/);
    if (sep < 0) return { start, end: start };

    const afterSep = rest.slice(sep + 1, sep + 80);
    const full = afterSep.match(FULL_DATE);
    if (full && full.index !== undefined && full.index < 20) return { start, end: parseIsoDate(full[0]) ?? start };

    const [sy, sm] = start.split("-").map(Number) as [number, number];
    const partial = afterSep.match(PARTIAL_DATE);
    if (partial && partial.index !== undefined && partial.index < 12) {
      const month = Number(partial[1]);
      const day = Number(partial[2]);
      const year = month < sm ? sy + 1 : sy;
      return { start, end: parseIsoDate(`${year}-${month}-${day}`) ?? start };
    }
    const dayOnly = afterSep.match(DAY_ONLY);
    if (dayOnly && dayOnly.index !== undefined && dayOnly.index < 8) {
      return { start, end: parseIsoDate(`${sy}-${sm}-${Number(dayOnly[1])}`) ?? start };
    }
    return { start, end: start };
  }
  return { start: null, end: null };
}

export function extractAnnouncementDate(text: string): IsoDate | null {
  const m = compactText(text).match(/(?:모집\s*공고일|공고일)\s*[:：]?\s*(\d{4}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2})/);
  return m ? parseIsoDate(m[1]) : null;
}

export function extractHouseholds(text: string): number | null {
  const m = compactText(text).match(/공급\s*(?:호수|세대수?|규모|물량)\s*[:：]?\s*(\d[\d,]*)\s*(?:세대|호)/);
  if (!m) return null;
  const n = Number(m[1]!.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "신청자격 : ..." 등 원문 발췌 (최대 maxLength 자) */
export function extractEligibilityExcerpt(text: string, maxLength = 300): string | null {
  const body = compactText(text);
  const m = body.match(/(?:신청\s*자격|입주\s*자격|입주\s*대상|신청\s*대상)\s*[:：]?\s*(.{10,})/);
  if (!m) return null;
  const excerpt = m[1]!.slice(0, maxLength);
  return excerpt.length < m[1]!.length ? `${excerpt}…` : excerpt;
}

const EXCLUDE_TITLE =
  /(당첨자|당첨결과|추첨결과|선정결과|합격자|결과\s*(?:발표|안내)?|발표|계약\s*체결|계약안내|서류\s*(?:제출|심사)|심사대상|재계약|입주\s*(?:안내|예정)|동호수|접수\s*마감\s*안내|설명회|점검|견학|개최|질의)/;
const EXCLUDE_NON_HOUSING = /(상가|토지|점포|근린생활|주차장|공장|용지|현상설계|입찰|공사\s*계약)/;
const INCLUDE_TITLE = /(모집|공급|분양|청약|신청\s*접수)/;

/** 게시판 글 중 '입주자 모집/분양/청약' 공고만 남긴다. */
export function isRecruitmentTitle(title: string): boolean {
  const t = compactText(title);
  if (EXCLUDE_NON_HOUSING.test(t)) return false;
  if (EXCLUDE_TITLE.test(t)) return false;
  return INCLUDE_TITLE.test(t);
}

export const SEOUL_GU = [
  "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구", "마포구",
  "서대문구", "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
];

export const INCHEON_SIGUNGU = ["중구", "동구", "미추홀구", "연수구", "남동구", "부평구", "계양구", "서구", "강화군", "옹진군"];

/** 제목에서 시군구 이름을 찾는다. 긴 이름 우선(예: '동대문구' 가 '동구' 보다 먼저). */
export function guessSigungu(title: string, candidates: string[]): string | null {
  const sorted = [...candidates].sort((a, b) => b.length - a.length);
  return sorted.find((c) => title.includes(c)) ?? null;
}
