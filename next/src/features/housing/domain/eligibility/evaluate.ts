import type { IsoDate } from "@/common/domain/date";
import { getNoticeStatus, type Notice } from "../notice";
import { isProfileEmpty, type ApplicantProfile } from "./applicant";
import { SUPPLY_RULES, YOUTH_MAX, YOUTH_MIN } from "./rules";

export type EligibilityVerdict = "eligible" | "check" | "ineligible";

export const VERDICT_LABELS: Record<EligibilityVerdict, string> = {
  eligible: "신청 가능",
  check: "조건 확인 필요",
  ineligible: "신청 불가",
};

export interface EligibilityResult {
  verdict: EligibilityVerdict;
  /** 판정 사유(불가/확인 필요 이유) */
  reasons: string[];
  /** 항상 참고해야 하는 안내 */
  notes: string[];
}

type GroupState = "yes" | "no" | "unknown";

function youthState(profile: ApplicantProfile): GroupState {
  if (profile.age === undefined) return "unknown";
  return profile.age >= YOUTH_MIN && profile.age <= YOUTH_MAX ? "yes" : "no";
}

function booleanState(value: boolean | undefined): GroupState {
  if (value === undefined) return "unknown";
  return value ? "yes" : "no";
}

/**
 * 공고와 신청자 조건으로 신청 가능 여부를 판정한다. (순수 함수)
 *  - 하나라도 명확히 불충족 → ineligible
 *  - 불충족은 없지만 입력이 비어 판정 불가 → check
 *  - 모두 충족 → eligible
 */
export function evaluateEligibility(
  notice: Pick<Notice, "supplyType" | "applicationStart" | "applicationEnd">,
  profile: ApplicantProfile,
  today: IsoDate,
): EligibilityResult {
  const rule = SUPPLY_RULES[notice.supplyType];
  const notes = rule.alwaysCheck ? [rule.alwaysCheck] : [];
  const fails: string[] = [];
  const unknowns: string[] = [];

  if (getNoticeStatus(notice, today) === "closed") {
    return { verdict: "ineligible", reasons: ["접수가 마감되었습니다."], notes };
  }

  if (notice.supplyType === "other") {
    return { verdict: "check", reasons: ["공급유형을 알 수 없어 자격을 판정할 수 없습니다."], notes };
  }

  if (isProfileEmpty(profile)) {
    return { verdict: "check", reasons: ["'내 조건'을 입력하면 신청 가능 여부를 판정합니다."], notes };
  }

  // 연령
  if (rule.minAge !== undefined || rule.maxAge !== undefined) {
    const range = `만 ${rule.minAge ?? 0}세${rule.maxAge !== undefined ? ` ~ ${rule.maxAge}세` : " 이상"}`;
    if (profile.age === undefined) {
      unknowns.push(`나이 입력 필요 (대상: ${range})`);
    } else if (
      (rule.minAge !== undefined && profile.age < rule.minAge) ||
      (rule.maxAge !== undefined && profile.age > rule.maxAge)
    ) {
      fails.push(`연령 기준 미충족 (대상: ${range})`);
    }
  }

  // 청년/신혼/대학생 그룹 (하나 이상 충족)
  if (rule.anyOfGroups) {
    const states = rule.anyOfGroups.map((group): GroupState => {
      if (group === "youth") return youthState(profile);
      if (group === "newlywed") return booleanState(profile.isNewlywed);
      return booleanState(profile.isStudent);
    });
    const labels = rule.anyOfGroups.map((g) => (g === "youth" ? "청년(만19~39세)" : g === "newlywed" ? "신혼부부" : "대학생·취준생"));
    if (!states.includes("yes")) {
      if (states.includes("unknown")) unknowns.push(`대상 유형 확인 필요 (${labels.join(" / ")})`);
      else fails.push(`대상 유형 아님 (${labels.join(" / ")})`);
    }
  }

  // 무주택
  if (rule.requiresHomeless) {
    if (profile.isHomeless === undefined) unknowns.push("무주택 여부 입력 필요");
    else if (!profile.isHomeless) fails.push("무주택 요건 미충족");
  }

  // 미혼
  if (rule.requiresUnmarried) {
    if (profile.isMarried === undefined) unknowns.push("혼인 여부 입력 필요 (미혼 대상)");
    else if (profile.isMarried) fails.push("미혼 대상 공급 (기혼은 신청 불가)");
  }

  // 소득
  if (rule.maxIncomeRatioPercent !== undefined) {
    const limit =
      profile.isNewlywed && rule.newlywedMaxIncomeRatioPercent !== undefined
        ? rule.newlywedMaxIncomeRatioPercent
        : rule.maxIncomeRatioPercent;
    if (profile.incomeRatioPercent === undefined) unknowns.push(`소득 입력 필요 (기준: 도시근로자 월평균소득 ${limit}% 이하)`);
    else if (profile.incomeRatioPercent > limit) fails.push(`소득 기준 초과 (기준: ${limit}% 이하)`);
  }

  if (fails.length > 0) return { verdict: "ineligible", reasons: fails, notes };
  if (unknowns.length > 0) return { verdict: "check", reasons: unknowns, notes };
  return { verdict: "eligible", reasons: ["입력하신 조건이 일반 자격 기준을 충족합니다."], notes };
}
