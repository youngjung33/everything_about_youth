import type { LivingGuide, LivingGuideDraft, GuideSourceRef } from "./guide";
import { uniqueRegions } from "@/common/domain/region";

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

/** 기관명을 병합키용으로 정규화한다. */
export function normalizeOrganization(org: string): string {
  return org.replace(/\s+/g, "").toLowerCase();
}

/** 제목에서 괄호 정정 표기 등을 제거하고 비교용 문자열을 만든다. */
export function normalizeTitle(title: string): string {
  return title
    .replace(/[\[(（【]\s*(정정|변경|재공고|연장|수정)[^\])）】]*[\])）】]/g, "")
    .replace(/[^0-9A-Za-z가-힣]/g, "")
    .toLowerCase();
}

/** 동일 생활·행정 안내 판별용 병합키 */
export function buildMergeKey(draft: Pick<LivingGuideDraft, "sources"> & { mergeKeyHint?: string }): string {
  const primary = draft.sources[0];
  if (primary) return `${primary.source}:${primary.externalId}`;
  return draft.mergeKeyHint ?? "unknown";
}

export function buildGuideId(mergeKey: string): string {
  return `l_${cyrb53(mergeKey).toString(36)}`;
}

export function createGuide(draft: LivingGuideDraft): LivingGuide {
  const mergeKey = buildMergeKey(draft);
  return { ...draft, mergeKey, id: buildGuideId(mergeKey) };
}

export function isSameGuide(a: LivingGuide, b: LivingGuide): boolean {
  if (a.mergeKey === b.mergeKey) return true;
  return a.sources.some((sa) => b.sources.some((sb) => sa.source === sb.source && sa.externalId === sb.externalId));
}

function unionSources(existing: GuideSourceRef[], incoming: GuideSourceRef[]): GuideSourceRef[] {
  const map = new Map<string, GuideSourceRef>();
  for (const s of existing) map.set(`${s.source}:${s.externalId}`, s);
  for (const s of incoming) map.set(`${s.source}:${s.externalId}`, s);
  return [...map.values()];
}

export function mergeGuide(existing: LivingGuide, incoming: LivingGuide): LivingGuide {
  const tags = [...new Set([...existing.tags, ...incoming.tags])];
  return {
    id: existing.id,
    mergeKey: incoming.mergeKey,
    title: existing.title,
    organization: existing.organization,
    procedureTypeId: existing.procedureTypeId !== "other" ? existing.procedureTypeId : incoming.procedureTypeId,
    tags,
    regions: uniqueRegions([...existing.regions, ...incoming.regions]),
    applicationStart: incoming.applicationStart ?? existing.applicationStart,
    applicationEnd: incoming.applicationEnd ?? existing.applicationEnd,
    announcementDate: incoming.announcementDate ?? existing.announcementDate,
    summary: incoming.summary ?? existing.summary,
    checklistSteps: incoming.checklistSteps.length > 0 ? incoming.checklistSteps : existing.checklistSteps,
    url: existing.url ?? incoming.url,
    sources: unionSources(existing.sources, incoming.sources),
  };
}
