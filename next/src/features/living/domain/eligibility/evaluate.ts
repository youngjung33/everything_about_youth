import type { IsoDate } from "@/common/domain/date";
import { getGuideStatus, type LivingGuide } from "../guide";
import { isProfileEmpty, type ApplicantProfile } from "./applicant";
import { PRODUCT_TYPE_RULES } from "./rules";
import type { ProcedureTypeId } from "../enums";

export type EligibilityVerdict = "eligible" | "check" | "ineligible";

export const VERDICT_LABELS: Record<EligibilityVerdict, string> = {
  eligible: "신청 가능",
  check: "조건 확인 필요",
  ineligible: "신청 불가",
};

export interface EligibilityResult {
  verdict: EligibilityVerdict;
  reasons: string[];
  notes: string[];
}

export function evaluateEligibility(
  program: Pick<LivingGuide, "procedureTypeId" | "applicationStart" | "applicationEnd" | "regions">,
  profile: ApplicantProfile,
  today: IsoDate,
): EligibilityResult {
  const rule = PRODUCT_TYPE_RULES[program.procedureTypeId];
  const notes = rule.alwaysCheck ? [rule.alwaysCheck] : [];
  const fails: string[] = [];
  const unknowns: string[] = [];

  if (getGuideStatus(program, today) === "closed") {
    return { verdict: "ineligible", reasons: ["신청이 마감되었습니다."], notes };
  }

  if (program.procedureTypeId === "other") {
    return { verdict: "check", reasons: ["절차 유형을 알 수 없어 안내를 특정할 수 없습니다."], notes };
  }

  if (isProfileEmpty(profile)) {
    return { verdict: "check", reasons: ["'내 조건'을 입력하면 참고 판정을 제공합니다."], notes };
  }

  if (rule.requiresResidenceMatch && program.regions.length > 0) {
    if (profile.residenceSido === undefined) {
      unknowns.push("거주 시도 입력 필요 (지역 안내가 있는 절차)");
    } else if (!program.regions.some((r) => r.sido === profile.residenceSido)) {
      fails.push("거주 지역이 안내 대상 지역과 다릅니다");
    }
  }

  if (fails.length > 0) return { verdict: "ineligible", reasons: fails, notes };
  if (unknowns.length > 0) return { verdict: "check", reasons: unknowns, notes };
  return { verdict: "eligible", reasons: ["입력하신 조건으로 절차 안내를 계속 볼 수 있습니다."], notes };
}

export function ruleForCategory(procedureTypeId: ProcedureTypeId) {
  return PRODUCT_TYPE_RULES[procedureTypeId];
}
