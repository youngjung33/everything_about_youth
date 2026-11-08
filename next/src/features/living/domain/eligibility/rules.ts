import type { ProcedureTypeId } from "../enums";

export interface ProcedureTypeRule {
  minAge?: number;
  maxAge?: number;
  requiresResidenceMatch?: boolean;
  alwaysCheck?: string;
}

/** 절차 유형별 참고 안내 (1차 living 은 판정 최소화) */
export const PROCEDURE_TYPE_RULES: Record<ProcedureTypeId, ProcedureTypeRule> = {
  move_in: {
    alwaysCheck: "전입신고는 관할 주민센터·정부24 절차와 필요 서류를 기관 안내에서 확인하세요.",
  },
  lease: {
    alwaysCheck: "확정일자·임대차 계약 순서와 등기부등본 확인이 중요합니다.",
  },
  moving: {
    alwaysCheck: "이사 당일 실측·하자 기록, 열쇠·관리비·주차 등을 계약서와 맞춰 확인하세요.",
  },
  utilities: {
    alwaysCheck: "전기·가스·수도·인터넷 명의 변경·해지 절차는 사업자마다 다릅니다.",
  },
  registry: {
    alwaysCheck: "등기·주민센터 업무는 관할 기관 안내를 따르세요.",
  },
  waste: {
    alwaysCheck: "쓰레기 배출·재활용 규정은 지자체·관리사무소 기준을 확인하세요.",
  },
  other: {
    alwaysCheck: "절차 유형을 특정할 수 없어 기관 공식 안내 확인이 필요합니다.",
  },
};

// 평가기 호환 별칭
export const PRODUCT_TYPE_RULES = PROCEDURE_TYPE_RULES;
export type ProductTypeRule = ProcedureTypeRule;
