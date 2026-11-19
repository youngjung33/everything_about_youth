/**
 * 자격 판정·프로필 파싱·meta `standards` DTO 공통 기준표.
 * 절차마다 요건이 다르므로 `evaluate.ts` 적용 범위는 `rules.ts`에 따르며, 기준표는 참고·소득 hint용이다.
 */
export const STANDARDS_YEAR = 2026;

/** 표에 있는 최대 가구원수. 이보다 많으면 8인으로 본다. */
export const MAX_HOUSEHOLD_SIZE = 8;

/** 전년도 도시근로자 가구원수별 가구당 월평균소득 100% (원). 1인 ~ 8인 */
export const URBAN_WORKER_INCOME_100: readonly number[] = [
  3_813_363, 5_866_270, 8_168_429, 8_802_202, 9_326_985, 9_906_263, 10_485_541, 11_064_819,
];

export const YOUTH_MAX_AGE = 39;
export const YOUTH_MIN_AGE = 19;

/** 가구원수를 표 범위(1~8)로 맞춘다. */
export function clampHouseholdSize(size: number): number {
  return Math.min(MAX_HOUSEHOLD_SIZE, Math.max(1, Math.floor(size)));
}

/** 가구원수별 기준 소득 100% (원) */
export function baseIncomeWon(size: number): number {
  return URBAN_WORKER_INCOME_100[clampHouseholdSize(size) - 1]!;
}

/** 1인 가구는 +20%p, 2인 가구는 +10%p 가산해 적용한다. */
export function smallHouseholdBonusPercent(size: number): number {
  const s = clampHouseholdSize(size);
  return s === 1 ? 20 : s === 2 ? 10 : 0;
}

/** 소득 상한(월, 원). percent 는 도시근로자 100% 대비 비율. */
export function incomeLimitWon(percent: number, size: number, smallHouseholdBonus: boolean): number {
  const effective = percent + (smallHouseholdBonus ? smallHouseholdBonusPercent(size) : 0);
  return Math.round((baseIncomeWon(size) * effective) / 100);
}

/** 1,234,567 → "1,234,567원" */
export function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")}원`;
}
