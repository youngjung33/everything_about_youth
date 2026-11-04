import type { CategoryId } from "../enums";
import { YOUTH_MAX_AGE, YOUTH_MIN_AGE } from "./standards";

export interface CategoryRule {
  minAge?: number;
  maxAge?: number;
  /** 청년(19~39) 대상 여부 */
  requiresYouth?: boolean;
  /** 거주 지역이 정책 지역과 같아야 하는지(미입력 시 확인 필요) */
  requiresResidenceMatch?: boolean;
  /** 도시근로자 월평균소득 대비 상한(%). 없으면 소득 검증 안 함 */
  incomePercent?: number;
  alwaysCheck?: string;
}

/** 분야별 일반적인 청년 정책 기준(참고용). */
export const CATEGORY_RULES: Record<CategoryId, CategoryRule> = {
  housing: {
    minAge: YOUTH_MIN_AGE,
    maxAge: YOUTH_MAX_AGE,
    requiresYouth: true,
    incomePercent: 100,
    alwaysCheck: "주거 지원은 무주택·소득·자산 기준이 정책마다 다릅니다. 기관 공식 안내에서 확인하세요.",
  },
  employment: {
    minAge: YOUTH_MIN_AGE,
    maxAge: YOUTH_MAX_AGE,
    requiresYouth: true,
    alwaysCheck: "취업·교육 연계 정책은 학력·경력 요건이 다릅니다. 기관 공식 안내에서 확인하세요.",
  },
  finance: {
    minAge: YOUTH_MIN_AGE,
    maxAge: YOUTH_MAX_AGE,
    requiresYouth: true,
    incomePercent: 120,
    alwaysCheck: "금융·세금 혜택은 소득·채무 조건이 다릅니다. 기관 공식 안내에서 확인하세요.",
  },
  welfare: {
    requiresYouth: false,
    alwaysCheck: "복지 정책은 대상 계층·가구 유형이 다양합니다. 기관 공식 안내에서 확인하세요.",
  },
  education: {
    minAge: YOUTH_MIN_AGE,
    maxAge: 34,
    requiresYouth: true,
    alwaysCheck: "교육·장학 정책은 학적·성적 요건이 있습니다. 기관 공식 안내에서 확인하세요.",
  },
  startup: {
    minAge: YOUTH_MIN_AGE,
    maxAge: 39,
    requiresYouth: true,
    alwaysCheck: "창업 지원은 사업자 등록·업력 조건이 있습니다. 기관 공식 안내에서 확인하세요.",
  },
  other: {
    alwaysCheck: "정책 분류를 알 수 없어 기관 공식 안내 확인이 필요합니다.",
  },
};

export { YOUTH_MIN_AGE, YOUTH_MAX_AGE };
