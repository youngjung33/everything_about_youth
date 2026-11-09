import type { IsoDate } from "@/common/domain/date";
import { getJobPostingStatus, type JobPosting } from "../job-posting";
import { isProfileEmpty, type ApplicantProfile } from "./applicant";
import { HIRE_TYPE_RULES, YOUTH_MAX_AGE, YOUTH_MIN_AGE } from "./rules";
import type { HireTypeId } from "../enums";

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
  program: Pick<JobPosting, "hireTypeId" | "applicationStart" | "applicationEnd" | "regions">,
  profile: ApplicantProfile,
  today: IsoDate,
): EligibilityResult {
  const rule = HIRE_TYPE_RULES[program.hireTypeId];
  const notes = rule.alwaysCheck ? [rule.alwaysCheck] : [];
  const fails: string[] = [];
  const unknowns: string[] = [];

  if (getJobPostingStatus(program, today) === "closed") {
    return { verdict: "ineligible", reasons: ["신청이 마감되었습니다."], notes };
  }

  if (program.hireTypeId === "other") {
    return { verdict: "check", reasons: ["채용 유형을 알 수 없어 자격을 판정할 수 없습니다."], notes };
  }

  if (isProfileEmpty(profile)) {
    return { verdict: "check", reasons: ["'내 조건'을 입력하면 신청 가능 여부를 판정합니다."], notes };
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
      unknowns.push("거주 시도 입력 필요 (지역 한정 채용)");
    } else if (!program.regions.some((r) => r.sido === profile.residenceSido)) {
      fails.push("거주 지역이 공고 대상 지역과 다릅니다");
    }
  }

  if (fails.length > 0) return { verdict: "ineligible", reasons: fails, notes };
  if (unknowns.length > 0) return { verdict: "check", reasons: unknowns, notes };
  return { verdict: "eligible", reasons: ["입력하신 조건이 이 공고의 일반 기준을 충족합니다."], notes };
}

export function ruleForCategory(hireTypeId: HireTypeId) {
  return HIRE_TYPE_RULES[hireTypeId];
}
