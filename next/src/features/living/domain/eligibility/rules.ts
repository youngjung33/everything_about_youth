import type { ProcedureTypeId } from "../enums";
import { YOUTH_MAX_AGE, YOUTH_MIN_AGE } from "./standards";

/** 도메인 interface: ProcedureTypeRule. */
export interface ProcedureTypeRule {
  minAge?: number; // minAge
  maxAge?: number; // maxAge
  /** 청년 전용 지원·안내에 연령 입력을 요구할 때 */
  requiresYouth?: boolean; // requiresYouth
  requiresResidenceMatch?: boolean; // requiresResidenceMatch
  alwaysCheck?: string; // alwaysCheck
}

export { YOUTH_MAX_AGE, YOUTH_MIN_AGE };

/**
 * 절차 유형별 참고 판정 규칙 (1차).
 *
 * - `requiresResidenceMatch`: 안내 `regions` 가 비어 있지 않을 때만 evaluate 가 거주 `residenceSido` 와 비교합니다.
 *   전국 공통 catalog(대부분)는 regions=[] 이므로 거주 불일치로 막지 않습니다.
 * - `alwaysCheck`: 판정과 관계없이 상세 `notes` 로 내려가는 기관 확인 문구입니다.
 */
export const PROCEDURE_TYPE_RULES: Record<ProcedureTypeId, ProcedureTypeRule> = {
  move_in: {
    requiresResidenceMatch: true,
    alwaysCheck: "전입신고는 관할 주민센터·정부24 절차와 필요 서류를 기관 안내에서 확인하세요.",
  },
  lease: {
    minAge: 19,
    requiresResidenceMatch: true,
    alwaysCheck: "확정일자·임대차 계약 순서와 등기부등본 확인이 중요합니다.",
  },
  moving: {
    requiresResidenceMatch: true,
    alwaysCheck: "이사 당일 실측·하자 기록, 열쇠·관리비·주차 등을 계약서와 맞춰 확인하세요.",
  },
  utilities: {
    requiresResidenceMatch: true,
    alwaysCheck: "전기·가스·수도·인터넷 명의 변경·해지 절차는 사업자마다 다릅니다.",
  },
  registry: {
    requiresResidenceMatch: true,
    alwaysCheck: "등기·주민센터 업무는 관할 기관 안내를 따르세요.",
  },
  waste: {
    requiresResidenceMatch: true,
    alwaysCheck: "쓰레기 배출·재활용 규정은 지자체·관리사무소 기준을 확인하세요.",
  },
  other: {
    alwaysCheck: "절차 유형을 특정할 수 없어 기관 공식 안내 확인이 필요합니다.",
  },
};

// 평가기 호환 별칭
export const PRODUCT_TYPE_RULES = PROCEDURE_TYPE_RULES;
/** 도메인 type: ProductTypeRule. */
export type ProductTypeRule = ProcedureTypeRule;
