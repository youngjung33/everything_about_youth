/**
 * 공공임대 자격 판정에 쓰는 기준표. **매년 바뀐다.**
 *
 * 갱신 방법: 아래 숫자와 `STANDARDS_YEAR` 만 고치면 된다. 판정 규칙(rules.ts)은 비율만 가지고 있다.
 * 출처(2026년 적용 기준)
 *  - 도시근로자 가구원수별 월평균소득: LH청약플러스 임대가이드, 마이홈포털
 *  - 기준 중위소득(통합공공임대): LH청약플러스 임대가이드, 공공데이터포털 'LH 가구원수별 기준중위소득(통합공공임대)'
 *  - 자산 기준: LH 행복주택·국민임대·영구임대 사업소개, 마이홈포털(소득 기준 2026.1.1., 자산 기준 2026.2.27. 공고문부터 적용)
 * 공고문의 기준이 항상 우선하며, 이 표는 참고용 판정에만 쓴다.
 */
export const STANDARDS_YEAR = 2026;

/** 표에 있는 최대 가구원수. 이보다 많으면 8인으로 본다. */
export const MAX_HOUSEHOLD_SIZE = 8;

/** 전년도 도시근로자 가구원수별 가구당 월평균소득 100% (원). 1인 ~ 8인 */
export const URBAN_WORKER_INCOME_100: readonly number[] = [
  3_813_363, 5_866_270, 8_168_429, 8_802_202, 9_326_985, 9_906_263, 10_485_541, 11_064_819,
];

/** 기준 중위소득 100% (원). 1인 ~ 8인 */
export const MEDIAN_INCOME_100: readonly number[] = [
  2_564_238, 4_199_292, 5_359_036, 6_494_738, 7_556_719, 8_555_952, 9_515_150, 10_474_348,
];

/** 총자산 기준 (원) */
export const TOTAL_ASSET_LIMIT_WON = {
  /** 국민임대·통합공공임대·매입임대, 행복주택(신혼부부·한부모·고령자), 청년매입·전세임대 2순위 */
  standard: 345_000_000,
  /** 행복주택(청년) */
  youth: 251_000_000,
  /** 행복주택(대학생) */
  student: 108_000_000,
  /** 영구임대 */
  permanent: 245_000_000,
} as const;

/** 자동차 가액 기준 (원) */
export const CAR_LIMIT_WON = 45_420_000;

export type IncomeBase = "urban_worker" | "median";

export const INCOME_BASE_LABELS: Record<IncomeBase, string> = {
  urban_worker: "도시근로자 월평균소득",
  median: "기준 중위소득",
};

/** 가구원수를 표 범위(1~8)로 맞춘다. */
export function clampHouseholdSize(size: number): number {
  return Math.min(MAX_HOUSEHOLD_SIZE, Math.max(1, Math.floor(size)));
}

/** 가구원수별 기준 소득 100% (원) */
export function baseIncomeWon(base: IncomeBase, size: number): number {
  const table = base === "urban_worker" ? URBAN_WORKER_INCOME_100 : MEDIAN_INCOME_100;
  return table[clampHouseholdSize(size) - 1]!;
}

/** 1인 가구는 +20%p, 2인 가구는 +10%p 가산해 적용한다. */
export function smallHouseholdBonusPercent(size: number): number {
  const s = clampHouseholdSize(size);
  return s === 1 ? 20 : s === 2 ? 10 : 0;
}

/**
 * 소득 상한(월, 원). 공고문 표와 같이 원 단위로 반올림한다.
 * 예) 1인 가구 도시근로자 100% (가산 적용) = 4,576,036원
 */
export function incomeLimitWon(base: IncomeBase, percent: number, size: number, smallHouseholdBonus: boolean): number {
  const effective = percent + (smallHouseholdBonus ? smallHouseholdBonusPercent(size) : 0);
  return Math.round((baseIncomeWon(base, size) * effective) / 100);
}

/** 1,234,567 → "1,234,567원" */
export function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")}원`;
}
