import type { HousingType } from "./enums";
import type { Complex, Notice, NoticeDraft, NoticeSourceRef } from "./notice";
import { uniqueRegions } from "@/common/domain/region";

/** 53bit 비암호화 해시 (cyrb53). 결정적 ID 생성용. */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

const ORG_ALIASES: Array<[RegExp, string]> = [
  [/한국토지주택공사|^lh(공사)?$/i, "lh"],
  [/서울주택도시(개발)?공사|^sh(공사)?$/i, "sh"],
  [/경기주택도시공사|^gh(공사)?$/i, "gh"],
  [/인천도시공사|^ih(공사)?$/i, "ih"],
];

export function normalizeOrganization(org: string): string {
  const compact = org.replace(/\s+/g, "");
  for (const [pattern, name] of ORG_ALIASES) {
    if (pattern.test(compact)) return name;
  }
  return compact.toLowerCase();
}

export function normalizeTitle(title: string): string {
  return title
    .replace(/[\[(（【]\s*(정정|변경|재공고|연장|수정)[^\])）】]*[\])）】]/g, "")
    .replace(/[^0-9A-Za-z가-힣]/g, "")
    .toLowerCase();
}

export function buildMergeKey(draft: Pick<NoticeDraft, "title" | "organization" | "applicationEnd">): string {
  return [normalizeTitle(draft.title), normalizeOrganization(draft.organization), draft.applicationEnd ?? ""].join("|");
}

export function buildNoticeId(mergeKey: string): string {
  return `n_${cyrb53(mergeKey).toString(36)}`;
}

export function createNotice(draft: NoticeDraft): Notice {
  const mergeKey = buildMergeKey(draft);
  return { ...draft, mergeKey, id: buildNoticeId(mergeKey) };
}

/** 같은 공고인지 판정: 병합키가 같거나, 같은 소스의 같은 외부 ID를 공유하면 같은 공고. */
export function isSameNotice(a: Notice, b: Notice): boolean {
  if (a.mergeKey === b.mergeKey) return true;
  return a.sources.some((sa) => b.sources.some((sb) => sa.source === sb.source && sa.externalId === sb.externalId));
}

function unionSources(existing: NoticeSourceRef[], incoming: NoticeSourceRef[]): NoticeSourceRef[] {
  const map = new Map<string, NoticeSourceRef>();
  for (const s of existing) map.set(`${s.source}:${s.externalId}`, s);
  for (const s of incoming) map.set(`${s.source}:${s.externalId}`, s); // 최신 수집분으로 교체
  return [...map.values()];
}

function unitCount(complexes: Complex[]): number {
  return complexes.reduce((sum, c) => sum + c.units.length, 0);
}

function pickComplexes(existing: Complex[], incoming: Complex[]): Complex[] {
  if (incoming.length === 0) return existing;
  if (existing.length === 0) return incoming;
  // 단위 정보가 더 풍부한 쪽을 채택, 같으면 최신(incoming)
  return unitCount(existing) > unitCount(incoming) ? existing : incoming;
}

/** 기존 공고(existing)에 새로 수집한 공고(incoming)를 병합한다. id는 기존 것을 유지한다. */
export function mergeNotice(existing: Notice, incoming: Notice): Notice {
  const housingTypes = [...new Set<HousingType>([...existing.housingTypes, ...incoming.housingTypes])];
  return {
    id: existing.id,
    mergeKey: incoming.mergeKey,
    title: existing.title,
    organization: existing.organization,
    supplyType: existing.supplyType !== "other" ? existing.supplyType : incoming.supplyType,
    housingTypes,
    regions: uniqueRegions([...existing.regions, ...incoming.regions]),
    applicationStart: incoming.applicationStart ?? existing.applicationStart,
    applicationEnd: incoming.applicationEnd ?? existing.applicationEnd,
    announcementDate: incoming.announcementDate ?? existing.announcementDate,
    winnerAnnouncementDate: incoming.winnerAnnouncementDate ?? existing.winnerAnnouncementDate,
    totalHouseholds: incoming.totalHouseholds ?? existing.totalHouseholds,
    eligibilityText: incoming.eligibilityText ?? existing.eligibilityText,
    url: existing.url ?? incoming.url,
    complexes: pickComplexes(existing.complexes, incoming.complexes),
    sources: unionSources(existing.sources, incoming.sources),
  };
}
