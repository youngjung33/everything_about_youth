import type { Sido } from "@/common/domain/region";

/** 신청자 조건. 모든 값은 선택 입력이며 비어 있으면 "확인 필요"로 판정된다. */
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
  /** 전년도 도시근로자 월평균소득 대비 가구소득 비율(%) */
  incomeRatioPercent?: number;
}

export const EMPTY_PROFILE: ApplicantProfile = {};

export function isProfileEmpty(profile: ApplicantProfile): boolean {
  return Object.values(profile).every((v) => v === undefined || v === null);
}
