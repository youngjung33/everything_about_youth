/**
 * 청년 정책 자격 판정 참고 기준표. 공고·정책마다 다르므로 참고용이다.
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
