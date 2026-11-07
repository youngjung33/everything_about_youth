import type { HireTypeId } from "../enums";
import { YOUTH_MAX_AGE, YOUTH_MIN_AGE } from "./standards";

export interface HireTypeRule {
  minAge?: number;
  maxAge?: number;
  requiresYouth?: boolean;
  requiresResidenceMatch?: boolean;
  alwaysCheck?: string;
}

/** 공고 유형별 참고용 자격 기준 */
export const HIRE_TYPE_RULES: Record<HireTypeId, HireTypeRule> = {
  public_official: {
    minAge: 18,
    maxAge: 40,
    alwaysCheck: "공무원 시험은 직급·가산점·응시자격(학력·연령)을 매 공고별로 확인해야 합니다.",
  },
  public_corp: {
    minAge: YOUTH_MIN_AGE,
    maxAge: YOUTH_MAX_AGE,
    requiresYouth: true,
    alwaysCheck: "공기업 채용은 NCS·학력·가점·전형 일정을 기관 공고에서 확인하세요.",
  },
  youth: {
    minAge: YOUTH_MIN_AGE,
    maxAge: YOUTH_MAX_AGE,
    requiresYouth: true,
    alwaysCheck: "청년 전용 채용은 연령·거주지·학력 요건이 공고마다 다릅니다.",
  },
  new_grad: {
    maxAge: 35,
    alwaysCheck: "신입 채용은 졸업 시기·경력 제한(신입 지원 가능 여부)을 공고 본문에서 확인하세요.",
  },
  intern: {
    minAge: 19,
    maxAge: 34,
    requiresYouth: true,
    alwaysCheck: "인턴·체험은 기간·시간·지원금·재학·졸업 요건이 다릅니다.",
  },
  other: {
    alwaysCheck: "채용 유형을 특정할 수 없어 기관 공식 공고 확인이 필요합니다.",
  },
};

export { YOUTH_MIN_AGE, YOUTH_MAX_AGE };
