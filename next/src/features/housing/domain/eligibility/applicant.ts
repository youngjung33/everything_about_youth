import type { Sido } from "@/common/domain/region";

/** 신청자 조건. 모든 값은 선택 입력이며 비어 있으면 "확인 필요"로 판정된다. 금액은 모두 원 단위. */
export interface ApplicantProfile {
  /** 만 나이 */
  age?: number;
  /** 현재 거주 시도 */
  residenceSido?: Sido;
  /** 무주택 세대구성원 여부 */
  isHomeless?: boolean;
  /** 혼인 여부 (미혼=false) */
  isMarried?: boolean;
  /** 혼인 7년 이내 신혼부부 여부 */
  isNewlywed?: boolean;
  /** 대학생/취업준비생 등 해당 여부 */
  isStudent?: boolean;
  /** 가구원수(1~8). 소득 기준이 가구원수별로 정해져 있다. */
  householdSize?: number;
  /** 세대구성원 전원의 월평균 소득 합계(세전, 원) */
  monthlyIncomeWon?: number;
  /** 맞벌이 여부. 신혼부부는 맞벌이일 때 소득 상한이 높다. */
  isDualIncome?: boolean;
  /** 총자산(부동산·자동차·금융자산 등을 합하고 부채를 뺀 금액, 원) */
  totalAssetWon?: number;
  /** 자동차 가액(원). 보유하지 않으면 0 */
  carValueWon?: number;
  /** 청약통장(주택청약종합저축) 가입 여부 */
  hasSubscriptionAccount?: boolean;
  /**
   * 도시근로자 월평균소득 대비 가구소득 비율(%).
   * 가구원수·월소득을 받기 전 버전과의 호환용이다. 가구원수와 월소득이 있으면 그쪽을 쓴다.
   */
  incomeRatioPercent?: number;
}

export const EMPTY_PROFILE: ApplicantProfile = {};

export function isProfileEmpty(profile: ApplicantProfile): boolean {
  return Object.values(profile).every((v) => v === undefined || v === null);
}
