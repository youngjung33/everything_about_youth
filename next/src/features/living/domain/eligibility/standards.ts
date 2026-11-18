/**
 * 프로필 쿼리 파싱·가구원 상한 등 **내부 상수**용.
 *
 * living 1차는 meta/API에 `standards`(소득 기준표)를 **내려주지 않습니다**.
 * 판정은 절차 유형·거주 시도·안내 지역·마감 위주(`evaluate.ts`)이며,
 * 소득·가구 필드는 jobs/housing과 동형 UX를 위해 보존하고 2차에서 규칙 확장에 쓸 수 있습니다.
 */
export const STANDARDS_YEAR = 2026;

export const MAX_HOUSEHOLD_SIZE = 8;

/** 전년도 도시근로자 가구원수별 가구당 월평균소득 100% (원). 1인 ~ 8인 */
export const URBAN_WORKER_INCOME_100: readonly number[] = [
  3_813_363, 5_866_270, 8_168_429, 8_802_202, 9_326_985, 9_906_263, 10_485_541, 11_064_819,
];

export const YOUTH_MAX_AGE = 39;
export const YOUTH_MIN_AGE = 19;

export function clampHouseholdSize(size: number): number {
  return Math.min(MAX_HOUSEHOLD_SIZE, Math.max(1, Math.floor(size)));
}

export function baseIncomeWon(size: number): number {
  return URBAN_WORKER_INCOME_100[clampHouseholdSize(size) - 1]!;
}

export function smallHouseholdBonusPercent(size: number): number {
  const s = clampHouseholdSize(size);
  return s === 1 ? 20 : s === 2 ? 10 : 0;
}

/** 소득 상한(월, 원). percent 는 도시근로자 100% 대비 비율. */
export function incomeLimitWon(percent: number, size: number, smallHouseholdBonus: boolean): number {
  const effective = percent + (smallHouseholdBonus ? smallHouseholdBonusPercent(size) : 0);
  return Math.round((baseIncomeWon(size) * effective) / 100);
}

export function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")}원`;
}
