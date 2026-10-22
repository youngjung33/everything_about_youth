import { describe, expect, it } from "vitest";
import type { ApplicantProfile } from "./applicant";
import { evaluateEligibility } from "./evaluate";
import { SUPPLY_RULES } from "./rules";
import {
  CAR_LIMIT_WON,
  MEDIAN_INCOME_100,
  STANDARDS_YEAR,
  TOTAL_ASSET_LIMIT_WON,
  URBAN_WORKER_INCOME_100,
  baseIncomeWon,
  clampHouseholdSize,
  formatWon,
  incomeLimitWon,
  smallHouseholdBonusPercent,
} from "./standards";
import { SUPPLY_TYPES, type SupplyType } from "../enums";

const today = "2026-10-12";
const open = { applicationStart: "2026-10-01", applicationEnd: "2026-10-20" };

function judge(supplyType: SupplyType, profile: ApplicantProfile) {
  return evaluateEligibility({ supplyType, ...open }, profile, today);
}

describe("기준표 (LH·마이홈 공고 수치와 대조)", () => {
  it("기준 연도와 표 길이", () => {
    expect(STANDARDS_YEAR).toBe(2026);
    expect(URBAN_WORKER_INCOME_100).toHaveLength(8);
    expect(MEDIAN_INCOME_100).toHaveLength(8);
  });

  it("가구원수가 늘면 기준 소득도 늘어난다", () => {
    for (const table of [URBAN_WORKER_INCOME_100, MEDIAN_INCOME_100]) {
      for (let i = 1; i < table.length; i++) expect(table[i]!).toBeGreaterThan(table[i - 1]!);
    }
  });

  it("도시근로자 소득 상한이 공고문 표와 같다 (1인 +20%p, 2인 +10%p 가산 포함)", () => {
    // 100%: 1인 120%, 2인 110%
    expect(incomeLimitWon("urban_worker", 100, 1, true)).toBe(4_576_036);
    expect(incomeLimitWon("urban_worker", 100, 2, true)).toBe(6_452_897);
    expect(incomeLimitWon("urban_worker", 100, 3, true)).toBe(8_168_429);
    expect(incomeLimitWon("urban_worker", 100, 8, true)).toBe(11_064_819);
    // 70%: 1인 90%, 2인 80%
    expect(incomeLimitWon("urban_worker", 70, 1, true)).toBe(3_432_027);
    expect(incomeLimitWon("urban_worker", 70, 2, true)).toBe(4_693_016);
    expect(incomeLimitWon("urban_worker", 70, 3, true)).toBe(5_717_900);
    expect(incomeLimitWon("urban_worker", 70, 4, true)).toBe(6_161_541);
    // 50%: 1인 70%, 2인 60%
    expect(incomeLimitWon("urban_worker", 50, 1, true)).toBe(2_669_354);
    expect(incomeLimitWon("urban_worker", 50, 2, true)).toBe(3_519_762);
    expect(incomeLimitWon("urban_worker", 50, 3, true)).toBe(4_084_215);
    // 신혼부부 맞벌이 120%
    expect(incomeLimitWon("urban_worker", 120, 3, true)).toBe(9_802_115);
  });

  it("기준 중위소득 상한이 공고문 표와 같다", () => {
    expect(incomeLimitWon("median", 150, 3, false)).toBe(8_038_554);
    expect(incomeLimitWon("median", 150, 4, false)).toBe(9_742_107);
    expect(incomeLimitWon("median", 150, 5, false)).toBe(11_335_079);
    expect(incomeLimitWon("median", 150, 8, false)).toBe(15_711_522);
    // 청년 통합공공임대: 1인 170%, 2인 160%
    expect(incomeLimitWon("median", 150, 1, true)).toBe(Math.round((2_564_238 * 170) / 100));
    expect(incomeLimitWon("median", 150, 2, true)).toBe(Math.round((4_199_292 * 160) / 100));
  });

  it("가구원수 보정과 가산", () => {
    expect(clampHouseholdSize(0)).toBe(1);
    expect(clampHouseholdSize(12)).toBe(8);
    expect(clampHouseholdSize(3.9)).toBe(3);
    expect(baseIncomeWon("urban_worker", 99)).toBe(11_064_819);
    expect([1, 2, 3, 4].map(smallHouseholdBonusPercent)).toEqual([20, 10, 0, 0]);
  });

  it("자산 기준값", () => {
    expect(TOTAL_ASSET_LIMIT_WON.standard).toBe(345_000_000);
    expect(TOTAL_ASSET_LIMIT_WON.youth).toBe(251_000_000);
    expect(TOTAL_ASSET_LIMIT_WON.student).toBe(108_000_000);
    expect(TOTAL_ASSET_LIMIT_WON.permanent).toBe(245_000_000);
    expect(CAR_LIMIT_WON).toBe(45_420_000);
  });

  it("금액 표기", () => {
    expect(formatWon(4_576_036)).toBe("4,576,036원");
  });

  it("모든 공급유형에 규칙이 있다", () => {
    for (const type of SUPPLY_TYPES) expect(SUPPLY_RULES[type]).toBeDefined();
  });
});

describe("소득: 가구원수별 금액 비교", () => {
  const youth = { age: 30, isHomeless: true, isMarried: false, totalAssetWon: 50_000_000, carValueWon: 0 };

  it("1인 가구는 가산된 상한(월 4,576,036원)까지 가능", () => {
    const ok = judge("happy_housing", { ...youth, householdSize: 1, monthlyIncomeWon: 4_576_036 });
    expect(ok.verdict).toBe("eligible");
    const over = judge("happy_housing", { ...youth, householdSize: 1, monthlyIncomeWon: 4_576_037 });
    expect(over.verdict).toBe("ineligible");
    expect(over.reasons.join(" ")).toContain("4,576,036원");
  });

  it("같은 소득이라도 가구원수가 많으면 기준이 넉넉하다", () => {
    const profile = { ...youth, monthlyIncomeWon: 6_000_000 };
    expect(judge("happy_housing", { ...profile, householdSize: 1 }).verdict).toBe("ineligible");
    expect(judge("happy_housing", { ...profile, householdSize: 2 }).verdict).toBe("eligible");
  });

  it("가구원수만 있고 소득이 없으면 확인 필요, 사유에 부족한 항목이 나온다", () => {
    const r = judge("national_rental", { isHomeless: true, householdSize: 3, totalAssetWon: 1, carValueWon: 0 });
    expect(r.verdict).toBe("check");
    expect(r.reasons.join(" ")).toContain("월 소득 입력 필요");
    expect(r.reasons.join(" ")).not.toContain("가구원수 입력 필요");
  });

  it("월소득만 있고 가구원수가 없으면 가구원수를 요청한다", () => {
    const r = judge("national_rental", { isHomeless: true, monthlyIncomeWon: 3_000_000, totalAssetWon: 1, carValueWon: 0 });
    expect(r.verdict).toBe("check");
    expect(r.reasons.join(" ")).toContain("가구원수 입력 필요");
  });

  it("국민임대: 3인 가구 월 5,717,900원 이하(70%)", () => {
    const base = { isHomeless: true, householdSize: 3, totalAssetWon: 100_000_000, carValueWon: 0 };
    expect(judge("national_rental", { ...base, monthlyIncomeWon: 5_717_900 }).verdict).toBe("eligible");
    expect(judge("national_rental", { ...base, monthlyIncomeWon: 5_717_901 }).verdict).toBe("ineligible");
  });

  it("영구임대: 50% 상한과 총자산 2.45억", () => {
    const base = { isHomeless: true, householdSize: 1, monthlyIncomeWon: 2_000_000, carValueWon: 0 };
    expect(judge("permanent_rental", { ...base, totalAssetWon: 245_000_000 }).verdict).toBe("eligible");
    expect(judge("permanent_rental", { ...base, totalAssetWon: 245_000_001 }).verdict).toBe("ineligible");
    expect(judge("permanent_rental", { ...base, monthlyIncomeWon: 2_669_355, totalAssetWon: 1 }).verdict).toBe("ineligible");
  });

  it("통합공공임대는 기준 중위소득 150%", () => {
    const base = { isHomeless: true, householdSize: 4, totalAssetWon: 100_000_000, carValueWon: 0 };
    expect(judge("integrated_public_rental", { ...base, monthlyIncomeWon: 9_742_107 }).verdict).toBe("eligible");
    expect(judge("integrated_public_rental", { ...base, monthlyIncomeWon: 9_742_108 }).verdict).toBe("ineligible");
  });

  it("기준 중위소득 유형은 예전 '소득 비율' 입력으로 판정할 수 없다", () => {
    const r = judge("integrated_public_rental", {
      isHomeless: true,
      incomeRatioPercent: 50,
      totalAssetWon: 1,
      carValueWon: 0,
    });
    expect(r.verdict).toBe("check");
    expect(r.reasons.join(" ")).toContain("가구원수 입력 필요");
  });

  it("예전 '소득 비율' 입력은 도시근로자 기준에서 계속 동작한다", () => {
    const base = { age: 30, isHomeless: true, totalAssetWon: 1, carValueWon: 0 };
    expect(judge("happy_housing", { ...base, incomeRatioPercent: 90 }).verdict).toBe("eligible");
    expect(judge("happy_housing", { ...base, incomeRatioPercent: 110 }).verdict).toBe("ineligible");
  });
});

describe("신혼부부 맞벌이 상한", () => {
  const newlywed = { age: 33, isHomeless: true, isNewlywed: true, householdSize: 3, totalAssetWon: 100_000_000, carValueWon: 0 };
  const between = 9_000_000; // 3인 100%(8,168,429) 초과, 120%(9,802,115) 이하

  it("맞벌이면 120%까지 가능", () => {
    expect(judge("happy_housing", { ...newlywed, monthlyIncomeWon: between, isDualIncome: true }).verdict).toBe("eligible");
  });

  it("맞벌이가 아니면 100%까지만", () => {
    const r = judge("happy_housing", { ...newlywed, monthlyIncomeWon: between, isDualIncome: false });
    expect(r.verdict).toBe("ineligible");
    expect(r.reasons.join(" ")).toContain("8,168,429원");
  });

  it("맞벌이 여부를 모르면 물어본다", () => {
    const r = judge("happy_housing", { ...newlywed, monthlyIncomeWon: between });
    expect(r.verdict).toBe("check");
    expect(r.reasons.join(" ")).toContain("맞벌이 여부 입력 필요");
  });

  it("맞벌이여도 120%를 넘으면 불가", () => {
    expect(
      judge("happy_housing", { ...newlywed, monthlyIncomeWon: 9_802_116, isDualIncome: true }).verdict,
    ).toBe("ineligible");
  });

  it("신혼부부가 아니면 맞벌이여도 100% 상한", () => {
    const r = judge("happy_housing", {
      age: 30,
      isHomeless: true,
      householdSize: 3,
      monthlyIncomeWon: between,
      isDualIncome: true,
      totalAssetWon: 1,
      carValueWon: 0,
    });
    expect(r.verdict).toBe("ineligible");
  });

  it("통합공공임대 신혼부부 맞벌이는 중위소득 180%", () => {
    const base = { isHomeless: true, isNewlywed: true, householdSize: 4, totalAssetWon: 1, carValueWon: 0 };
    const between150and180 = 11_000_000; // 150% = 9,742,107, 180% = 11,690,528
    expect(judge("integrated_public_rental", { ...base, monthlyIncomeWon: between150and180, isDualIncome: true }).verdict).toBe(
      "eligible",
    );
    expect(judge("integrated_public_rental", { ...base, monthlyIncomeWon: between150and180, isDualIncome: false }).verdict).toBe(
      "ineligible",
    );
  });
});

describe("자산·자동차", () => {
  const base = { age: 30, isHomeless: true, householdSize: 1, monthlyIncomeWon: 2_000_000 };

  it("행복주택 청년: 총자산 2.51억 이하", () => {
    expect(judge("happy_housing", { ...base, totalAssetWon: 251_000_000, carValueWon: 0 }).verdict).toBe("eligible");
    const over = judge("happy_housing", { ...base, totalAssetWon: 251_000_001, carValueWon: 0 });
    expect(over.verdict).toBe("ineligible");
    expect(over.reasons.join(" ")).toContain("총자산 기준 초과");
  });

  it("행복주택 신혼부부는 총자산 3.45억까지 (청년 기준보다 넉넉)", () => {
    const profile = { ...base, age: 41, isNewlywed: true, totalAssetWon: 300_000_000, carValueWon: 0 };
    expect(judge("happy_housing", profile).verdict).toBe("eligible");
    // 같은 자산이라도 신혼부부가 아닌 청년이면 불가
    expect(judge("happy_housing", { ...profile, age: 30, isNewlywed: false }).verdict).toBe("ineligible");
  });

  it("청년이면서 신혼부부면 더 유리한 쪽(3.45억)으로 본다", () => {
    const r = judge("happy_housing", { ...base, isNewlywed: true, totalAssetWon: 300_000_000, carValueWon: 0 });
    expect(r.verdict).toBe("eligible");
  });

  it("자동차 가액 4,542만원 초과는 불가", () => {
    const ok = judge("national_rental", { isHomeless: true, householdSize: 1, monthlyIncomeWon: 1_000_000, totalAssetWon: 1, carValueWon: 45_420_000 });
    expect(ok.verdict).toBe("eligible");
    const over = judge("national_rental", { isHomeless: true, householdSize: 1, monthlyIncomeWon: 1_000_000, totalAssetWon: 1, carValueWon: 45_420_001 });
    expect(over.verdict).toBe("ineligible");
    expect(over.reasons.join(" ")).toContain("자동차 가액 기준 초과");
  });

  it("행복주택 대학생: 자동차 보유 불가, 총자산 1.08억", () => {
    const student = { isHomeless: true, isStudent: true, householdSize: 3, monthlyIncomeWon: 5_000_000 };
    const noCar = judge("happy_housing", { ...student, totalAssetWon: 100_000_000, carValueWon: 0 });
    expect(noCar.verdict).toBe("eligible");
    const withCar = judge("happy_housing", { ...student, totalAssetWon: 100_000_000, carValueWon: 10_000_000 });
    expect(withCar.verdict).toBe("ineligible");
    expect(withCar.reasons.join(" ")).toContain("자동차를 보유하면");
    expect(judge("happy_housing", { ...student, totalAssetWon: 108_000_001, carValueWon: 0 }).verdict).toBe("ineligible");
  });

  it("대학생이면서 청년이면 자동차가 있어도 청년 기준으로 가능", () => {
    const r = judge("happy_housing", {
      age: 24,
      isHomeless: true,
      isStudent: true,
      householdSize: 3,
      monthlyIncomeWon: 5_000_000,
      totalAssetWon: 100_000_000,
      carValueWon: 10_000_000,
    });
    expect(r.verdict).toBe("eligible");
  });

  it("자산을 입력하지 않으면 확인 필요, 무엇이 필요한지 알려준다", () => {
    const r = judge("national_rental", { isHomeless: true, householdSize: 1, monthlyIncomeWon: 1_000_000 });
    expect(r.verdict).toBe("check");
    expect(r.reasons.join(" ")).toContain("총자산 입력 필요");
    expect(r.reasons.join(" ")).toContain("자동차 가액 입력 필요");
  });

  it("소득이 이미 기준을 넘으면 자산이 비어 있어도 불가로 판정한다", () => {
    const r = judge("national_rental", { isHomeless: true, householdSize: 1, monthlyIncomeWon: 9_000_000 });
    expect(r.verdict).toBe("ineligible");
  });

  it("자산 기준이 없는 유형은 자산을 묻지 않는다", () => {
    const r = judge("public_rental", { isHomeless: true });
    expect(r.verdict).toBe("eligible");
  });

  it("기준표 연도를 안내한다", () => {
    const r = judge("national_rental", { isHomeless: true });
    expect(r.notes.join(" ")).toContain(`${STANDARDS_YEAR}년`);
  });
});

describe("청약통장", () => {
  it("분양은 청약통장이 필요하다", () => {
    expect(judge("public_sale", { age: 30, isHomeless: true, hasSubscriptionAccount: true }).verdict).toBe("eligible");
    const none = judge("public_sale", { age: 30, isHomeless: true, hasSubscriptionAccount: false });
    expect(none.verdict).toBe("ineligible");
    expect(none.reasons.join(" ")).toContain("청약통장");
    const unknown = judge("private_sale", { age: 30 });
    expect(unknown.verdict).toBe("check");
    expect(unknown.reasons.join(" ")).toContain("청약통장 가입 여부 입력 필요");
  });

  it("임대는 청약통장을 묻지 않는다", () => {
    const r = judge("national_rental", { isHomeless: true, householdSize: 1, monthlyIncomeWon: 1_000_000, totalAssetWon: 1, carValueWon: 0 });
    expect(r.reasons.join(" ")).not.toContain("청약통장");
  });
});

describe("청년매입·전세임대", () => {
  const ok = { age: 30, isHomeless: true, isMarried: false, householdSize: 1, monthlyIncomeWon: 3_000_000, totalAssetWon: 100_000_000, carValueWon: 0 };

  it("기준 이내면 가능", () => {
    expect(judge("youth_purchase_rental", ok).verdict).toBe("eligible");
    expect(judge("jeonse_rental", ok).verdict).toBe("eligible");
  });

  it("기혼이거나 연령 초과면 불가", () => {
    expect(judge("youth_purchase_rental", { ...ok, isMarried: true }).verdict).toBe("ineligible");
    expect(judge("jeonse_rental", { ...ok, age: 40 }).verdict).toBe("ineligible");
  });

  it("총자산 3.45억 초과는 불가", () => {
    expect(judge("youth_purchase_rental", { ...ok, totalAssetWon: 345_000_001 }).verdict).toBe("ineligible");
  });
});
