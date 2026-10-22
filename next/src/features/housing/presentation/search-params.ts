import type { ApplicantProfile } from "@/features/housing/domain/eligibility/applicant";
import { isProfileEmpty } from "@/features/housing/domain/eligibility/applicant";
import { MAX_HOUSEHOLD_SIZE } from "@/features/housing/domain/eligibility/standards";
import type { EligibilityVerdict } from "@/features/housing/domain/eligibility/evaluate";
import {
  HOUSING_TYPES,
  NOTICE_STATUSES,
  SUPPLY_TYPES,
  type HousingType,
  type NoticeStatus,
  type SupplyType,
} from "@/features/housing/domain/enums";
import { SIDO_LIST, type Sido } from "@/common/domain/region";
import type { NoticeSort } from "@/features/housing/application/ports/notice-repository";
import type { NoticeFilters } from "@/features/housing/application/use-cases/search-notices";

export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * URL 의 '내 조건' 파라미터 키 (localStorage 저장 대상)
 *  - household: 가구원수(1~8), monthly: 세대 월 소득(만원), dual: 맞벌이(y/n)
 *  - asset: 총자산(만원), car: 자동차 가액(만원, 없으면 0), account: 청약통장(y/n)
 *  - income: 도시근로자 월평균소득 대비 비율(%). household·monthly 이전 버전 호환용
 */
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
  "account",
  "income",
] as const;

/** 금액 입력 상한(만원). 터무니없는 값을 걸러낸다. */
const MAX_MONTHLY_INCOME_MAN = 100_000;
const MAX_ASSET_MAN = 10_000_000;
export const VERDICTS: EligibilityVerdict[] = ["eligible", "check", "ineligible"];

export interface ParsedSearch {
  filters: NoticeFilters;
  sort: NoticeSort;
  page: number;
  profile: ApplicantProfile;
  hasProfile: boolean;
  verdicts: EligibilityVerdict[];
  /** 폼에 다시 채워 넣기 위한 값 */
  form: {
    sidos: Sido[];
    sigungu: string;
    supplyTypes: SupplyType[];
    housingTypes: HousingType[];
    statuses: NoticeStatus[];
    q: string;
    maxDepositMan: string;
    maxRentMan: string;
    minArea: string;
    maxArea: string;
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

/** 만원 단위 입력을 원으로 바꾼다. 범위를 벗어나면 undefined. */
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
  const supplyTypes = pick(many(raw.supply), SUPPLY_TYPES);
  const housingTypes = pick(many(raw.housing), HOUSING_TYPES);
  const statuses = pick(many(raw.status), NOTICE_STATUSES);
  const q = one(raw.q);
  const sigungu = one(raw.sigungu);

  const maxDepositMan = one(raw.maxDeposit);
  const maxRentMan = one(raw.maxRent);
  const minArea = one(raw.minArea);
  const maxArea = one(raw.maxArea);

  const maxDeposit = numberOrUndefined(maxDepositMan);
  const maxRent = numberOrUndefined(maxRentMan);

  const filters: NoticeFilters = {
    sidos: sidos.length ? sidos : undefined,
    sigungu: sidos.length && sigungu ? sigungu : undefined,
    supplyTypes: supplyTypes.length ? supplyTypes : undefined,
    housingTypes: housingTypes.length ? housingTypes : undefined,
    statuses: statuses.length ? statuses : undefined,
    maxDeposit: maxDeposit !== undefined ? maxDeposit * 10_000 : undefined,
    maxMonthlyRent: maxRent !== undefined ? maxRent * 10_000 : undefined,
    minAreaM2: numberOrUndefined(minArea),
    maxAreaM2: numberOrUndefined(maxArea),
    keyword: q || undefined,
  };

  const profile: ApplicantProfile = {
    age: numberOrUndefined(one(raw.age), 0, 120),
    isHomeless: triState(one(raw.home)),
    isMarried: triState(one(raw.married)),
    isNewlywed: triState(one(raw.newlywed)),
    isStudent: triState(one(raw.student)),
    householdSize: integerOrUndefined(one(raw.household), 1, MAX_HOUSEHOLD_SIZE),
    monthlyIncomeWon: manToWon(one(raw.monthly), MAX_MONTHLY_INCOME_MAN),
    isDualIncome: triState(one(raw.dual)),
    totalAssetWon: manToWon(one(raw.asset), MAX_ASSET_MAN),
    carValueWon: manToWon(one(raw.car), MAX_ASSET_MAN),
    hasSubscriptionAccount: triState(one(raw.account)),
    incomeRatioPercent: numberOrUndefined(one(raw.income), 0, 1000),
  };

  const sortRaw = one(raw.sort);
  const sort: NoticeSort = sortRaw === "latest" ? "latest" : "deadline";
  const page = Math.max(1, Math.floor(numberOrUndefined(one(raw.page), 1, 100000) ?? 1));

  return {
    filters,
    sort,
    page,
    profile,
    hasProfile: !isProfileEmpty(profile),
    verdicts: pick(many(raw.v), VERDICTS),
    form: { sidos, sigungu, supplyTypes, housingTypes, statuses, q, maxDepositMan, maxRentMan, minArea, maxArea },
  };
}

/** 기존 쿼리에서 일부 값만 바꾼 쿼리 문자열을 만든다. undefined/null 은 삭제. */
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

/** 상세 페이지 링크에 이어 붙일 '내 조건' 쿼리만 추출 */
export function profileQuery(raw: RawSearchParams): string {
  const qs = new URLSearchParams();
  for (const key of PROFILE_KEYS) {
    const v = one(raw[key]);
    if (v) qs.set(key, v);
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}
