import type { IsoDate } from "@/common/domain/date";
import { getGuideStatus, type LivingGuide } from "../guide";
import { isProfileEmpty, type ApplicantProfile } from "./applicant";
import { PRODUCT_TYPE_RULES, YOUTH_MAX_AGE, YOUTH_MIN_AGE } from "./rules";
import type { ProcedureTypeId } from "../enums";

/** living 참고 판정 코드. */
export type EligibilityVerdict = "eligible" | "check" | "ineligible";

/** API·앱에 노출하는 판정 한글 라벨. */
export const VERDICT_LABELS: Record<EligibilityVerdict, string> = {
  eligible: "신청 가능",
  check: "조건 확인 필요",
  ineligible: "신청 불가",
};

/** 목록·상세 `eligibility` 본문. */
export interface EligibilityResult {
  verdict: EligibilityVerdict; // 판정 코드
  reasons: string[]; // 사용자에게 보이는 사유
  notes: string[]; // 절차별 alwaysCheck 안내
}

/**
 * 생활·행정 안내와 신청자 조건으로 신청 가능 여부를 판정한다. (순수 함수)
 *  - 하나라도 명확히 불충족 → ineligible
 *  - 불충족은 없지만 입력이 비어 판정 불가 → check
 *  - 모두 충족 → eligible
 */
export function evaluateEligibility(
  program: Pick<LivingGuide, "procedureTypeId" | "applicationStart" | "applicationEnd" | "regions">,
  profile: ApplicantProfile,
  today: IsoDate,
): EligibilityResult {
  const rule = PRODUCT_TYPE_RULES[program.procedureTypeId]; // 절차 유형별 규칙
  const notes = rule.alwaysCheck ? [rule.alwaysCheck] : []; // 상세 notes 로 내려갈 고정 안내
  const fails: string[] = []; // ineligible 사유
  const unknowns: string[] = []; // check 사유(입력 부족 등)

  if (getGuideStatus(program, today) === "closed") {
    return { verdict: "ineligible", reasons: ["신청이 마감되었습니다."], notes };
  }

  if (program.procedureTypeId === "other") {
    return { verdict: "check", reasons: ["절차 유형을 알 수 없어 안내를 특정할 수 없습니다."], notes };
  }

  if (isProfileEmpty(profile)) {
    return { verdict: "check", reasons: ["'내 조건'을 입력하면 참고 판정을 제공합니다."], notes };
  }

  if (rule.requiresYouth) {
    if (profile.age === undefined) {
      unknowns.push(`나이 입력 필요 (청년: 만 ${YOUTH_MIN_AGE}~${YOUTH_MAX_AGE}세)`);
    } else if (profile.age < YOUTH_MIN_AGE || profile.age > YOUTH_MAX_AGE) {
      fails.push(`청년 연령 기준 미충족 (만 ${YOUTH_MIN_AGE}~${YOUTH_MAX_AGE}세)`);
    }
  }

  if (rule.minAge !== undefined || rule.maxAge !== undefined) {
    const range = `만 ${rule.minAge ?? 0}세${rule.maxAge !== undefined ? ` ~ ${rule.maxAge}세` : " 이상"}`;
    if (profile.age === undefined) unknowns.push(`나이 입력 필요 (대상: ${range})`);
    else if (
      (rule.minAge !== undefined && profile.age < rule.minAge) ||
      (rule.maxAge !== undefined && profile.age > rule.maxAge)
    ) {
      fails.push(`연령 기준 미충족 (대상: ${range})`);
    }
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

/** 절차 유형 id 로 `rules.ts` 항목을 조회한다. */
export function ruleForCategory(procedureTypeId: ProcedureTypeId) {
  return PRODUCT_TYPE_RULES[procedureTypeId];
}
