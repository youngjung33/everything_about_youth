import type { ProductTypeId } from "../enums";
import { YOUTH_MAX_AGE, YOUTH_MIN_AGE } from "./standards";

export interface ProductTypeRule {
  minAge?: number;
  maxAge?: number;
  requiresYouth?: boolean;
  requiresHomeless?: boolean;
  requiresResidenceMatch?: boolean;
  incomePercent?: number;
  alwaysCheck?: string;
}

/** 제도 유형별 참고용 자격 기준 */
export const PRODUCT_TYPE_RULES: Record<ProductTypeId, ProductTypeRule> = {
  jeonse_loan: {
    minAge: YOUTH_MIN_AGE,
    maxAge: YOUTH_MAX_AGE,
    requiresYouth: true,
    requiresHomeless: true,
    incomePercent: 100,
    alwaysCheck: "전세·주택자금 대출은 LTV·DSR·보유주택·연소득 기준이 금융사·상품마다 다릅니다.",
  },
  lease_deposit: {
    minAge: YOUTH_MIN_AGE,
    maxAge: YOUTH_MAX_AGE,
    requiresYouth: true,
    requiresHomeless: true,
    incomePercent: 100,
    alwaysCheck: "임대보증금 대출·지원은 임차보증금·소득·무주택 요건을 원문에서 확인하세요.",
  },
  housing_savings: {
    minAge: 19,
    maxAge: 39,
    requiresYouth: true,
    alwaysCheck: "청약·주택저축은 가입 기간·순위·무주택 요건이 다릅니다.",
  },
  guarantee: {
    minAge: YOUTH_MIN_AGE,
    maxAge: YOUTH_MAX_AGE,
    requiresYouth: true,
    alwaysCheck: "보증·보증보험은 보증한도·신용·채무 조건이 있습니다.",
  },
  tax_benefit: {
    requiresYouth: false,
    incomePercent: 120,
    alwaysCheck: "세금·소득공제는 소득·주택 보유·공제 한도가 다릅니다.",
  },
  other: {
    alwaysCheck: "제도 유형을 특정할 수 없어 원문 확인이 필요합니다.",
  },
};

export { YOUTH_MIN_AGE, YOUTH_MAX_AGE };
