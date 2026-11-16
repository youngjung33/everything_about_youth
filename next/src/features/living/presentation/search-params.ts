import type { ApplicantProfile } from "@/features/living/domain/eligibility/applicant";
import { isProfileEmpty } from "@/features/living/domain/eligibility/applicant";
import type { EligibilityVerdict } from "@/features/living/domain/eligibility/evaluate";
import { PROCEDURE_TYPE_IDS, GUIDE_STATUSES, type ProcedureTypeId, type GuideStatus } from "@/features/living/domain/enums";
import { SIDO_LIST, type Sido } from "@/common/domain/region";
import type { GuideSort } from "@/features/living/application/ports/guide-repository";
import type { GuideFilters } from "@/features/living/application/use-cases/search-guides";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const PROFILE_KEYS = [
  "age",
  "home",
  "married",
  "newlywed",
  "student",
  "household",
  "monthly",
  "dual",
  "asset",
  "car",
  "income",
  "residence",
] as const;

const MAX_MONTHLY_INCOME_MAN = 100_000;
const MAX_ASSET_MAN = 10_000_000;
export const VERDICTS: EligibilityVerdict[] = ["eligible", "check", "ineligible"];

export interface ParsedSearch {
  filters: GuideFilters;
  sort: GuideSort;
  page: number;
  profile: ApplicantProfile;
  hasProfile: boolean;
  verdicts: EligibilityVerdict[];
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

const triState = (v: string): boolean | undefined => (v === "y" ? true : v === "n" ? false : undefined);

function manToWon(value: string, max: number): number | undefined {
  const n = numberOrUndefined(value, 0, max);
  return n === undefined ? undefined : Math.round(n * 10_000);
}

function integerOrUndefined(value: string, min: number, max: number): number | undefined {
  const n = numberOrUndefined(value, min, max);
  return n === undefined || !Number.isInteger(n) ? undefined : n;
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

  const residence = one(raw.residence);
  const profile: ApplicantProfile = {
    age: numberOrUndefined(one(raw.age), 0, 120),
    residenceSido: (SIDO_LIST as readonly string[]).includes(residence) ? (residence as Sido) : undefined,
    isHomeless: triState(one(raw.home)),
    isMarried: triState(one(raw.married)),
    isNewlywed: triState(one(raw.newlywed)),
    isStudent: triState(one(raw.student)),
    householdSize: integerOrUndefined(one(raw.household), 1, 8),
    monthlyIncomeWon: manToWon(one(raw.monthly), MAX_MONTHLY_INCOME_MAN),
    isDualIncome: triState(one(raw.dual)),
    totalAssetWon: manToWon(one(raw.asset), MAX_ASSET_MAN),
    carValueWon: manToWon(one(raw.car), MAX_ASSET_MAN),
    incomeRatioPercent: numberOrUndefined(one(raw.income), 0, 1000),
  };

  const sortRaw = one(raw.sort);
  const sort: GuideSort = sortRaw === "latest" ? "latest" : "deadline";
  const page = Math.max(1, Math.floor(numberOrUndefined(one(raw.page), 1, 100000) ?? 1));

  return {
    filters,
    sort,
    page,
    profile,
    hasProfile: !isProfileEmpty(profile),
    verdicts: pick(many(raw.v), VERDICTS),
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