import type { IsoDate } from "@/common/domain/date";
import { getNoticeStatus, type Notice } from "../notice";
import { isProfileEmpty, type ApplicantProfile } from "./applicant";
import { SUPPLY_RULES, YOUTH_MAX, YOUTH_MIN, type ApplicantGroup, type AssetRule, type IncomeRule, type MoneyRule } from "./rules";
import { INCOME_BASE_LABELS, STANDARDS_YEAR, formatWon, incomeLimitWon } from "./standards";

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

const GROUP_LABELS: Record<ApplicantGroup, string> = {
  youth: "청년(만19~39세)",
  newlywed: "신혼부부",
  student: "대학생·취준생",
};

function youthState(profile: ApplicantProfile): GroupState {
  if (profile.age === undefined) return "unknown";
  return profile.age >= YOUTH_MIN && profile.age <= YOUTH_MAX ? "yes" : "no";
}

function booleanState(value: boolean | undefined): GroupState {
  if (value === undefined) return "unknown";
  return value ? "yes" : "no";
}

function groupState(group: ApplicantGroup, profile: ApplicantProfile): GroupState {
  if (group === "youth") return youthState(profile);
  if (group === "newlywed") return booleanState(profile.isNewlywed);
  return booleanState(profile.isStudent);
}

/** 한 묶음의 판정 결과. fails 가 하나라도 있으면 불가, unknowns 만 있으면 확인 필요. */
interface Outcome {
  fails: string[];
  unknowns: string[];
}

const man = (won: number): string => `${Math.round(won / 10_000).toLocaleString("en-US")}만원`;

function checkIncome(rule: IncomeRule, profile: ApplicantProfile): Outcome {
  const out: Outcome = { fails: [], unknowns: [] };
  const baseLabel = INCOME_BASE_LABELS[rule.base];
  const { householdSize: size, monthlyIncomeWon: income } = profile;

  if (size !== undefined && income !== undefined) {
    const baseLimit = incomeLimitWon(rule.base, rule.percent, size, rule.smallHouseholdBonus);
    // 맞벌이 상한은 신혼부부에게만 적용한다.
    const dualLimit =
      rule.dualIncomePercent !== undefined && profile.isNewlywed === true
        ? incomeLimitWon(rule.base, rule.dualIncomePercent, size, rule.smallHouseholdBonus)
        : undefined;

    if (income <= baseLimit) return out;
    if (dualLimit !== undefined && income <= dualLimit) {
      if (profile.isDualIncome === true) return out;
      if (profile.isDualIncome === undefined) {
        out.unknowns.push(`맞벌이 여부 입력 필요 (맞벌이 신혼부부는 ${size}인 가구 월 ${formatWon(dualLimit)} 이하)`);
        return out;
      }
    }
    const limit = profile.isDualIncome === true && dualLimit !== undefined ? dualLimit : baseLimit;
    out.fails.push(`소득 기준 초과 (${baseLabel} ${size}인 가구 월 ${formatWon(limit)} 이하, 입력 ${formatWon(income)})`);
    return out;
  }

  // 가구원수·월소득을 받기 전 버전의 '소득 비율' 입력. 도시근로자 기준에서만 비교할 수 있다.
  if (profile.incomeRatioPercent !== undefined && rule.base === "urban_worker") {
    const limit = rule.dualIncomePercent !== undefined && profile.isNewlywed === true ? rule.dualIncomePercent : rule.percent;
    if (profile.incomeRatioPercent > limit) out.fails.push(`소득 기준 초과 (기준: ${baseLabel} ${limit}% 이하)`);
    return out;
  }

  const base = `기준: ${baseLabel} ${rule.percent}% 이하`;
  if (size === undefined) out.unknowns.push(`가구원수 입력 필요 (${base})`);
  if (income === undefined) out.unknowns.push(`월 소득 입력 필요 (${base})`);
  return out;
}

function checkAssets(rule: AssetRule, profile: ApplicantProfile): Outcome {
  const out: Outcome = { fails: [], unknowns: [] };

  if (rule.totalWon !== undefined) {
    if (profile.totalAssetWon === undefined) out.unknowns.push(`총자산 입력 필요 (기준: ${man(rule.totalWon)} 이하)`);
    else if (profile.totalAssetWon > rule.totalWon) {
      out.fails.push(`총자산 기준 초과 (기준 ${man(rule.totalWon)} 이하, 입력 ${man(profile.totalAssetWon)})`);
    }
  }

  if (rule.carWon !== undefined) {
    const need = rule.carWon === 0 ? "자동차 보유 불가" : `기준: ${man(rule.carWon)} 이하`;
    if (profile.carValueWon === undefined) out.unknowns.push(`자동차 가액 입력 필요 (${need}, 없으면 0)`);
    else if (profile.carValueWon > rule.carWon) {
      out.fails.push(
        rule.carWon === 0
          ? "자동차를 보유하면 신청할 수 없는 계층입니다"
          : `자동차 가액 기준 초과 (기준 ${man(rule.carWon)} 이하, 입력 ${man(profile.carValueWon)})`,
      );
    }
  }
  return out;
}

function checkMoney(rule: MoneyRule, profile: ApplicantProfile): Outcome {
  const income = rule.income ? checkIncome(rule.income, profile) : { fails: [], unknowns: [] };
  const assets = rule.assets ? checkAssets(rule.assets, profile) : { fails: [], unknowns: [] };
  return { fails: [...income.fails, ...assets.fails], unknowns: [...income.unknowns, ...assets.unknowns] };
}

/** 불충족이 가장 적고, 같다면 확인할 것이 가장 적은 쪽. 계층이 여럿이면 신청자에게 가장 유리한 계층이다. */
function bestOutcome(outcomes: Outcome[]): Outcome | undefined {
  return [...outcomes].sort((a, b) => a.fails.length - b.fails.length || a.unknowns.length - b.unknowns.length)[0];
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
  if (rule.money || rule.groupMoney) {
    notes.push(`${STANDARDS_YEAR}년 적용 소득·자산 기준표로 판정했습니다. 공고문의 기준이 우선합니다.`);
  }
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
  let matchedGroups: ApplicantGroup[] = [];
  let groupsUnresolved = false;
  if (rule.anyOfGroups) {
    const states = rule.anyOfGroups.map((group) => ({ group, state: groupState(group, profile) }));
    matchedGroups = states.filter((s) => s.state === "yes").map((s) => s.group);
    const labels = rule.anyOfGroups.map((g) => GROUP_LABELS[g]);
    if (matchedGroups.length === 0) {
      if (states.some((s) => s.state === "unknown")) {
        groupsUnresolved = true;
        unknowns.push(`대상 유형 확인 필요 (${labels.join(" / ")})`);
      } else {
        fails.push(`대상 유형 아님 (${labels.join(" / ")})`);
      }
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

  // 소득·자산
  const moneyOutcomes: Outcome[] = [];
  if (rule.groupMoney) {
    // 해당하는 계층 중 가장 유리한 쪽. 계층을 아직 모르면 가능한 모든 계층 중 가장 유리한 쪽으로 본다.
    const candidates = matchedGroups.length > 0 ? matchedGroups : groupsUnresolved ? (rule.anyOfGroups ?? []) : [];
    for (const group of candidates) {
      const groupRule = rule.groupMoney[group];
      if (groupRule) moneyOutcomes.push(checkMoney(groupRule, profile));
    }
  } else if (rule.money) {
    moneyOutcomes.push(checkMoney(rule.money, profile));
  }
  const money = bestOutcome(moneyOutcomes);
  if (money) {
    fails.push(...money.fails);
    unknowns.push(...money.unknowns);
  }

  // 청약통장
  if (rule.requiresSubscriptionAccount) {
    if (profile.hasSubscriptionAccount === undefined) unknowns.push("청약통장 가입 여부 입력 필요");
    else if (!profile.hasSubscriptionAccount) fails.push("청약통장(주택청약종합저축) 가입이 필요합니다");
  }

  if (fails.length > 0) return { verdict: "ineligible", reasons: fails, notes };
  if (unknowns.length > 0) return { verdict: "check", reasons: unknowns, notes };
  return { verdict: "eligible", reasons: ["입력하신 조건이 일반 자격 기준을 충족합니다."], notes };
}
