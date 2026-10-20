import type { SupplyType } from "../enums";

/**
 * 공급유형별 자격 규칙(일반적인 기준). 실제 공고마다 다를 수 있으므로
 * 판정 결과는 참고용이며 항상 원문 공고 확인이 필요하다.
 */
export interface SupplyRule {
  /** 연령 하한/상한(만 나이). 없으면 제한 없음 */
  minAge?: number;
  maxAge?: number;
  /** 무주택 요건 */
  requiresHomeless: boolean;
  /** 미혼 요건 */
  requiresUnmarried?: boolean;
  /** 월평균소득 대비 상한(%) */
  maxIncomeRatioPercent?: number;
  /** 신혼부부는 소득 상한이 다른 경우 */
  newlywedMaxIncomeRatioPercent?: number;
  /** 청년(연령 조건)·신혼·대학생 등 그룹 중 하나 이상 충족해야 하는 유형 */
  anyOfGroups?: Array<"youth" | "newlywed" | "student">;
  /** 항상 원문 확인이 필요한 사유(자산·청약통장 등) */
  alwaysCheck?: string;
}

const YOUTH_MIN = 19;
const YOUTH_MAX = 39;

export const SUPPLY_RULES: Record<SupplyType, SupplyRule> = {
  happy_housing: {
    requiresHomeless: true,
    maxIncomeRatioPercent: 100,
    newlywedMaxIncomeRatioPercent: 120,
    anyOfGroups: ["youth", "newlywed", "student"],
    alwaysCheck: "자산·자동차 기준과 소득 상세 기준(가구원수별)은 공고문에서 확인하세요.",
  },
  youth_purchase_rental: {
    minAge: YOUTH_MIN,
    maxAge: YOUTH_MAX,
    requiresHomeless: true,
    requiresUnmarried: true,
    maxIncomeRatioPercent: 100,
    alwaysCheck: "소득 1순위(50% 이하)/2순위(100% 이하) 및 자산 기준을 공고문에서 확인하세요.",
  },
  national_rental: {
    requiresHomeless: true,
    maxIncomeRatioPercent: 70,
    alwaysCheck: "자산·자동차 기준과 지역 우선공급 요건을 공고문에서 확인하세요.",
  },
  permanent_rental: {
    requiresHomeless: true,
    maxIncomeRatioPercent: 50,
    alwaysCheck: "생계·의료급여 수급자 등 우선 대상 요건을 공고문에서 확인하세요.",
  },
  jeonse_rental: {
    minAge: YOUTH_MIN,
    maxAge: YOUTH_MAX,
    requiresHomeless: true,
    requiresUnmarried: true,
    maxIncomeRatioPercent: 100,
    alwaysCheck: "청년 전세임대는 소득 순위·자산 기준 및 전세 계약 가능 주택 요건을 확인하세요.",
  },
  integrated_public_rental: {
    requiresHomeless: true,
    maxIncomeRatioPercent: 150,
    alwaysCheck: "소득 기준은 계층(최저/중위/중산층)별로 다르며 자산·자동차 기준을 공고문에서 확인하세요.",
  },
  long_term_jeonse: {
    requiresHomeless: true,
    maxIncomeRatioPercent: 100,
    alwaysCheck: "장기전세는 소득·자산·청약통장 요건이 공고별로 다르므로 공고문을 확인하세요.",
  },
  purchase_rental: {
    requiresHomeless: true,
    maxIncomeRatioPercent: 70,
    alwaysCheck: "일반 매입임대는 수급자·한부모·청년 등 계층별 요건이 다르므로 공고문을 확인하세요.",
  },
  public_rental: {
    requiresHomeless: true,
    alwaysCheck: "10년·50년 공공임대는 소득·자산 기준과 우선공급 대상이 공고마다 다르므로 공고문을 확인하세요.",
  },
  public_support_rental: {
    minAge: 19,
    requiresHomeless: true,
    alwaysCheck: "특별공급(청년·신혼 등) 소득/자산 기준과 청약통장 요건을 공고문에서 확인하세요.",
  },
  private_rental: {
    minAge: 19,
    requiresHomeless: false,
    alwaysCheck: "민간임대는 사업자별 모집 조건이 다르므로 공고문을 확인하세요.",
  },
  public_sale: {
    minAge: 19,
    requiresHomeless: true,
    alwaysCheck: "청약통장 가입기간·납입횟수, 자산·소득 기준을 공고문에서 확인하세요.",
  },
  private_sale: {
    minAge: 19,
    requiresHomeless: false,
    alwaysCheck: "청약통장·거주지역·특별공급 요건을 청약홈 공고문에서 확인하세요.",
  },
  newlywed_hope_town: {
    requiresHomeless: true,
    requiresUnmarried: false,
    anyOfGroups: ["newlywed"],
    maxIncomeRatioPercent: 130,
    alwaysCheck: "혼인기간/자녀 요건과 자산 기준을 공고문에서 확인하세요.",
  },
  other: {
    requiresHomeless: false,
    alwaysCheck: "공급유형을 알 수 없어 공고문 확인이 필요합니다.",
  },
};

export { YOUTH_MIN, YOUTH_MAX };
