import { PROCEDURE_TYPE_IDS, GUIDE_STATUSES, type ProcedureTypeId, type GuideStatus } from "@/features/living/domain/enums";
import { SIDO_LIST, type Sido } from "@/common/domain/region";
import type { GuideSort } from "@/features/living/application/ports/guide-repository";
import type { GuideFilters } from "@/features/living/application/use-cases/search-guides";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export interface ParsedSearch {
  filters: GuideFilters;
  sort: GuideSort;
  page: number;
  form: {
    sidos: Sido[];
    sigungu: string;
    procedureTypeIds: ProcedureTypeId[];
    tags: string[];
    statuses: GuideStatus[];
    q: string;
  };
}

const many = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : v.split(",").filter(Boolean);
const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? (v[0] ?? "") : (v ?? "")).trim();
const pick = <T extends string>(values: string[], allowed: readonly T[]): T[] =>
  [...new Set(values)].filter((v): v is T => (allowed as readonly string[]).includes(v));

function numberOrUndefined(value: string, min = 0, max = Number.MAX_SAFE_INTEGER): number | undefined {
  if (value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
}

export function parseSearchParams(raw: RawSearchParams): ParsedSearch {
  const sidos = pick(many(raw.sido), SIDO_LIST);
  const procedureTypeIds = pick(many(raw.category), PROCEDURE_TYPE_IDS);
  const tags = many(raw.tag).map((t) => t.trim()).filter(Boolean);
  const statuses = pick(many(raw.status), GUIDE_STATUSES);
  const q = one(raw.q);
  const sigungu = one(raw.sigungu);

  const filters: GuideFilters = {
    sidos: sidos.length ? sidos : undefined,
    sigungu: sidos.length && sigungu ? sigungu : undefined,
    procedureTypeIds: procedureTypeIds.length ? procedureTypeIds : undefined,
    tags: tags.length ? tags : undefined,
    statuses: statuses.length ? statuses : undefined,
    keyword: q || undefined,
  };

  const sortRaw = one(raw.sort);
  const sort: GuideSort = sortRaw === "latest" ? "latest" : "deadline";
  const page = Math.max(1, Math.floor(numberOrUndefined(one(raw.page), 1, 100000) ?? 1));

  return {
    filters,
    sort,
    page,
    form: { sidos, sigungu, procedureTypeIds, tags, statuses, q },
  };
}

export function buildQuery(raw: RawSearchParams, overrides: Record<string, string | string[] | number | null | undefined> = {}): string {
  const qs = new URLSearchParams();
  const merged: Record<string, string | string[] | number | null | undefined> = { ...raw, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
    else qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}
