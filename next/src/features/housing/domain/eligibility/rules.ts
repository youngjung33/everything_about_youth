import type { SupplyType } from "../enums";
import { CAR_LIMIT_WON, TOTAL_ASSET_LIMIT_WON, type IncomeBase } from "./standards";

/** 청년 · 신혼부부 · 대학생(취준생) 중 하나 이상 충족해야 하는 유형의 계층 */
export type ApplicantGroup = "youth" | "newlywed" | "student";

/** 소득 상한. 금액은 기준표(standards.ts)에서 가구원수별로 계산한다. */
export interface IncomeRule {
  base: IncomeBase;
  /** 기준 소득 대비 상한(%) */
  percent: number;
  /** 맞벌이 신혼부부의 상한(%). 없으면 맞벌이 구분이 없다. */
  dualIncomePercent?: number;
  /** 1인 가구 +20%p, 2인 가구 +10%p 가산 여부 */
  smallHouseholdBonus: boolean;
}

/** 자산 상한(원). 없으면 판정하지 않는다. */
export interface AssetRule {
  totalWon?: number;
  /** 0 이면 자동차를 보유하지 않아야 한다. */
  carWon?: number;
}

export interface MoneyRule {
  income?: IncomeRule;
  assets?: AssetRule;
}

/**
 * 공급유형별 자격 규칙(일반적인 기준). 실제 공고마다 다를 수 있으므로
 * 판정 결과는 참고용이며 항상 원문 공고 확인이 필요하다.
 */
export interface SupplyRule {
  /** 연령 하한/상한(만 나이). 없으면 제한 없음 */
  minAge?: number;
  maxAge?: number;
  /** 무주택 요건 */
  requiresHomeless: boolean;
  /** 미혼 요건 */
  requiresUnmarried?: boolean;
  /** 계층 중 하나 이상 충족해야 하는 유형 */
  anyOfGroups?: ApplicantGroup[];
  /** 소득·자산 기준 (계층 구분이 없는 유형) */
  money?: MoneyRule;
  /** 계층별 소득·자산 기준. 해당 계층이 여럿이면 가장 유리한 쪽으로 판정한다. */
  groupMoney?: Partial<Record<ApplicantGroup, MoneyRule>>;
  /** 청약통장(입주자저축) 가입이 필요한 유형 */
  requiresSubscriptionAccount?: boolean;
  /** 항상 원문 확인이 필요한 사유 */
  alwaysCheck?: string;
}

const YOUTH_MIN = 19;
const YOUTH_MAX = 39;

const STANDARD_ASSETS: AssetRule = { totalWon: TOTAL_ASSET_LIMIT_WON.standard, carWon: CAR_LIMIT_WON };

/** 도시근로자 월평균소득 기준, 1·2인 가구 가산 적용 */
const urban = (percent: number, extra: Partial<IncomeRule> = {}): IncomeRule => ({
  base: "urban_worker",
  percent,
  smallHouseholdBonus: true,
  ...extra,
});

/** 청년매입임대·청년전세임대: 2순위(본인+부모 소득, 국민임대 자산 기준)를 기준으로 가장 넓게 본다. */
const YOUTH_SUPPORT_RULE: SupplyRule = {
  minAge: YOUTH_MIN,
  maxAge: YOUTH_MAX,
  requiresHomeless: true,
  requiresUnmarried: true,
  money: { income: urban(100), assets: STANDARD_ASSETS },
};

export const SUPPLY_RULES: Record<SupplyType, SupplyRule> = {
  happy_housing: {
    requiresHomeless: true,
    anyOfGroups: ["youth", "newlywed", "student"],
    groupMoney: {
      youth: {
        income: urban(100),
        assets: { totalWon: TOTAL_ASSET_LIMIT_WON.youth, carWon: CAR_LIMIT_WON },
      },
      newlywed: {
        income: urban(100, { dualIncomePercent: 120 }),
        assets: STANDARD_ASSETS,
      },
      student: {
        income: urban(100),
        assets: { totalWon: TOTAL_ASSET_LIMIT_WON.student, carWon: 0 },
      },
    },
    alwaysCheck: "대학생은 본인과 부모의 소득을 합산하고, 소득·자산 산정 방식과 우선공급 기준은 공고문에서 확인하세요.",
  },
  youth_purchase_rental: {
    ...YOUTH_SUPPORT_RULE,
    alwaysCheck:
      "순위별 기준이 다릅니다(1순위 수급자·차상위·한부모는 자산 검증 없음, 3순위는 본인 소득·총자산 2억 5,100만원 이하). 공고문에서 확인하세요.",
  },
  national_rental: {
    requiresHomeless: true,
    money: { income: urban(70), assets: STANDARD_ASSETS },
    alwaysCheck: "전용면적별로 소득 기준이 다르고(50㎡ 미만 50%, 60㎡ 초과 100%) 지역 우선공급 요건이 있습니다. 공고문에서 확인하세요.",
  },
  permanent_rental: {
    requiresHomeless: true,
    money: { income: urban(50), assets: { totalWon: TOTAL_ASSET_LIMIT_WON.permanent, carWon: CAR_LIMIT_WON } },
    alwaysCheck: "생계·의료급여 수급자 등 우선 대상 요건을 공고문에서 확인하세요.",
  },
  jeonse_rental: {
    ...YOUTH_SUPPORT_RULE,
    alwaysCheck: "청년 전세임대는 소득 순위·자산 기준 및 전세 계약 가능 주택 요건을 확인하세요.",
  },
  integrated_public_rental: {
    requiresHomeless: true,
    money: {
      income: { base: "median", percent: 150, dualIncomePercent: 180, smallHouseholdBonus: true },
      assets: STANDARD_ASSETS,
    },
    alwaysCheck: "기준 중위소득 100% 이하는 우선공급, 150% 이하는 일반공급입니다. 계층별 요건은 공고문에서 확인하세요.",
  },
  long_term_jeonse: {
    requiresHomeless: true,
    // 장기전세는 2026 기준표를 확인하지 못해 소득 상한만 일반 기준으로 본다.
    money: { income: { base: "urban_worker", percent: 100, smallHouseholdBonus: false } },
    alwaysCheck: "장기전세는 소득·자산·청약통장 요건이 공고별로 다르므로 공고문을 확인하세요.",
  },
  purchase_rental: {
    requiresHomeless: true,
    money: { income: urban(70), assets: STANDARD_ASSETS },
    alwaysCheck: "일반 매입임대는 수급자·한부모·청년 등 계층별 요건이 다르므로 공고문을 확인하세요.",
  },
  public_rental: {
    requiresHomeless: true,
    alwaysCheck: "10년·50년 공공임대는 소득·자산 기준과 우선공급 대상이 공고마다 다르므로 공고문을 확인하세요.",
  },
  public_support_rental: {
    minAge: 19,
    requiresHomeless: true,
    alwaysCheck: "특별공급(청년·신혼 등) 소득/자산 기준과 청약통장 요건을 공고문에서 확인하세요.",
  },
  private_rental: {
    minAge: 19,
    requiresHomeless: false,
    alwaysCheck: "민간임대는 사업자별 모집 조건이 다르므로 공고문을 확인하세요.",
  },
  public_sale: {
    minAge: 19,
    requiresHomeless: true,
    requiresSubscriptionAccount: true,
    alwaysCheck: "청약통장 가입기간·납입횟수, 자산·소득 기준을 공고문에서 확인하세요.",
  },
  private_sale: {
    minAge: 19,
    requiresHomeless: false,
    requiresSubscriptionAccount: true,
    alwaysCheck: "청약통장 가입기간·납입횟수·거주지역·특별공급 요건을 청약홈 공고문에서 확인하세요.",
  },
  newlywed_hope_town: {
    requiresHomeless: true,
    requiresUnmarried: false,
    anyOfGroups: ["newlywed"],
    // 신혼희망타운은 2026 기준표를 확인하지 못해 기존 일반 기준(130%)을 유지한다.
    money: { income: { base: "urban_worker", percent: 130, smallHouseholdBonus: false } },
    requiresSubscriptionAccount: true,
    alwaysCheck: "혼인기간/자녀 요건, 자산 기준, 청약통장 요건을 공고문에서 확인하세요.",
  },
  other: {
    requiresHomeless: false,
    alwaysCheck: "공급유형을 알 수 없어 공고문 확인이 필요합니다.",
  },
};

export { YOUTH_MIN, YOUTH_MAX };
