import type { IsoDate } from "@/common/domain/date";
import { getGuideStatus, type LivingGuide } from "../guide";
import { isProfileEmpty, type ApplicantProfile } from "./applicant";
import { PRODUCT_TYPE_RULES, YOUTH_MAX_AGE, YOUTH_MIN_AGE } from "./rules";
import { STANDARDS_YEAR, formatWon, incomeLimitWon } from "./standards";
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

interface Outcome {
  fails: string[];
  unknowns: string[];
}

function checkIncome(percent: number, profile: ApplicantProfile): Outcome {
  const out: Outcome = { fails: [], unknowns: [] };
  const { householdSize: size, monthlyIncomeWon: income } = profile;
  if (size !== undefined && income !== undefined) {
    const limit = incomeLimitWon(percent, size, true);
    if (income > limit) {
      out.fails.push(`소득 기준 초과 (도시근로자 ${size}인 가구 월 ${formatWon(limit)} 이하, 입력 ${formatWon(income)})`);
    }
    return out;
  }
  if (profile.incomeRatioPercent !== undefined) {
    if (profile.incomeRatioPercent > percent) out.fails.push(`소득 기준 초과 (기준: 도시근로자 ${percent}% 이하)`);
    return out;
  }
  if (size === undefined) out.unknowns.push(`가구원수 입력 필요 (기준: 도시근로자 ${percent}% 이하)`);
  if (income === undefined) out.unknowns.push(`월 소득 입력 필요 (기준: 도시근로자 ${percent}% 이하)`);
  return out;
}

export function evaluateEligibility(
  program: Pick<LivingGuide, "procedureTypeId" | "applicationStart" | "applicationEnd" | "regions">,
  profile: ApplicantProfile,
  today: IsoDate,
): EligibilityResult {
  const rule = PRODUCT_TYPE_RULES[program.procedureTypeId];
  const notes = rule.alwaysCheck ? [rule.alwaysCheck] : [];
  if (rule.incomePercent) {
    notes.push(`${STANDARDS_YEAR}년 도시근로자 소득 기준표로 판정했습니다. 세부 조건은 기관 공식 안내가 우선합니다.`);
  }
  const fails: string[] = [];
  const unknowns: string[] = [];

  if (getGuideStatus(program, today) === "closed") {
    return { verdict: "ineligible", reasons: ["신청이 마감되었습니다."], notes };
  }

  if (program.procedureTypeId === "other") {
    return { verdict: "check", reasons: ["정책 분류를 알 수 없어 자격을 판정할 수 없습니다."], notes };
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

  if (rule.requiresHomeless && profile.isHomeless === false) {
    fails.push("무주택 요건을 충족하지 않습니다");
  }
  if (rule.requiresHomeless && profile.isHomeless === undefined) {
    unknowns.push("무주택 여부 입력 필요");
  }

  if (rule.requiresResidenceMatch && program.regions.length > 0) {
    if (profile.residenceSido === undefined) {
      unknowns.push("거주 시도 입력 필요 (지역 한정 정책)");
    } else if (!program.regions.some((r) => r.sido === profile.residenceSido)) {
      fails.push("거주 지역이 정책 대상 지역과 다릅니다");
    }
  }

  if (rule.incomePercent) {
    const income = checkIncome(rule.incomePercent, profile);
    fails.push(...income.fails);
    unknowns.push(...income.unknowns);
  }

  if (fails.length > 0) return { verdict: "ineligible", reasons: fails, notes };
  if (unknowns.length > 0) return { verdict: "check", reasons: unknowns, notes };
  return { verdict: "eligible", reasons: ["입력하신 조건이 일반 청년 정책 기준을 충족합니다."], notes };
}

export function ruleForCategory(procedureTypeId: ProcedureTypeId) {
  return PRODUCT_TYPE_RULES[procedureTypeId];
}
