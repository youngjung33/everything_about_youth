import type { FinanceScheme, FinanceSchemeDraft, SchemeSourceRef } from "./scheme";
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

/** 기관명 공백 제거·소문자 통일 */
export function normalizeOrganization(org: string): string {
  return org.replace(/\s+/g, "").toLowerCase();
}

/** 정정·재공고 꼬리표 제거 후 검색용 정규화 */
export function normalizeTitle(title: string): string {
  return title
    .replace(/[\[(（【]\s*(정정|변경|재공고|연장|수정)[^\])）】]*[\])）】]/g, "")
    .replace(/[^0-9A-Za-z가-힣]/g, "")
    .toLowerCase();
}

/** 소스 외부 ID 기반 병합키. 소스가 없으면 hint 또는 unknown. */
export function buildMergeKey(draft: Pick<FinanceSchemeDraft, "sources"> & { mergeKeyHint?: string }): string {
  const primary = draft.sources[0];
  if (primary) return `${primary.source}:${primary.externalId}`;
  return draft.mergeKeyHint ?? "unknown";
}

/** 병합키로 내부 상품 ID 생성 */
export function buildSchemeId(mergeKey: string): string {
  return `f_${cyrb53(mergeKey).toString(36)}`;
}

/** 초안에 id·mergeKey 를 부여해 도메인 엔티티로 만든다. */
export function createScheme(draft: FinanceSchemeDraft): FinanceScheme {
  const mergeKey = buildMergeKey(draft);
  return { ...draft, mergeKey, id: buildSchemeId(mergeKey) };
}

/** 같은 상품인지 판정: 병합키가 같거나, 같은 소스의 같은 외부 ID를 공유하면 동일. */
export function isSameScheme(a: FinanceScheme, b: FinanceScheme): boolean {
  if (a.mergeKey === b.mergeKey) return true;
  return a.sources.some((sa) => b.sources.some((sb) => sa.source === sb.source && sa.externalId === sb.externalId));
}

function unionSources(existing: SchemeSourceRef[], incoming: SchemeSourceRef[]): SchemeSourceRef[] {
  const map = new Map<string, SchemeSourceRef>();
  for (const s of existing) map.set(`${s.source}:${s.externalId}`, s);
  for (const s of incoming) map.set(`${s.source}:${s.externalId}`, s); // 최신 수집분으로 교체
  return [...map.values()];
}

/** 기존 상품(existing)에 새로 수집한 상품(incoming)을 병합한다. id는 기존 것을 유지한다. */
export function mergeScheme(existing: FinanceScheme, incoming: FinanceScheme): FinanceScheme {
  const tags = [...new Set([...existing.tags, ...incoming.tags])];
  return {
    id: existing.id,
    mergeKey: incoming.mergeKey,
    title: existing.title,
    organization: existing.organization,
    productTypeId: existing.productTypeId !== "other" ? existing.productTypeId : incoming.productTypeId,
    tags,
    regions: uniqueRegions([...existing.regions, ...incoming.regions]),
    applicationStart: incoming.applicationStart ?? existing.applicationStart,
    applicationEnd: incoming.applicationEnd ?? existing.applicationEnd,
    announcementDate: incoming.announcementDate ?? existing.announcementDate,
    summary: incoming.summary ?? existing.summary,
    url: existing.url ?? incoming.url,
    sources: unionSources(existing.sources, incoming.sources),
  };
}
