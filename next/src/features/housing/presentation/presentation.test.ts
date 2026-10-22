import { describe, expect, it } from "vitest";
import { buildQuery, parseSearchParams, profileQuery } from "./search-params";

describe("search params", () => {
  it("필터와 내 조건을 파싱한다 (만원 → 원)", () => {
    const p = parseSearchParams({
      sido: ["서울", "경기", "없는시도"],
      sigungu: "강남구",
      supply: "happy_housing",
      housing: ["apartment", "officetel"],
      maxDeposit: "5000",
      maxRent: "30",
      minArea: "20",
      q: " 행복 ",
      age: "29",
      home: "y",
      married: "n",
      income: "80",
      v: ["eligible", "check"],
      sort: "latest",
      page: "3",
    });
    expect(p.filters).toMatchObject({
      sidos: ["서울", "경기"],
      sigungu: "강남구",
      supplyTypes: ["happy_housing"],
      housingTypes: ["apartment", "officetel"],
      maxDeposit: 50_000_000,
      maxMonthlyRent: 300_000,
      minAreaM2: 20,
      keyword: "행복",
    });
    expect(p.profile).toEqual({ age: 29, isHomeless: true, isMarried: false, isNewlywed: undefined, isStudent: undefined, incomeRatioPercent: 80 });
    expect(p.hasProfile).toBe(true);
    expect(p.verdicts).toEqual(["eligible", "check"]);
    expect(p.sort).toBe("latest");
    expect(p.page).toBe(3);
  });
  it("소득·자산 조건을 파싱한다 (만원 → 원)", () => {
    const p = parseSearchParams({
      household: "3",
      monthly: "650",
      dual: "y",
      asset: "12000",
      car: "0",
      account: "n",
    });
    expect(p.profile).toMatchObject({
      householdSize: 3,
      monthlyIncomeWon: 6_500_000,
      isDualIncome: true,
      totalAssetWon: 120_000_000,
      carValueWon: 0,
      hasSubscriptionAccount: false,
    });
    expect(p.hasProfile).toBe(true);
  });
  it("소득·자산의 잘못된 값은 무시한다", () => {
    const p = parseSearchParams({ household: "0", monthly: "-1", asset: "abc", car: "99999999999", dual: "x", account: "" });
    expect(p.hasProfile).toBe(false);
    expect(parseSearchParams({ household: "9" }).profile.householdSize).toBeUndefined();
    expect(parseSearchParams({ household: "2.5" }).profile.householdSize).toBeUndefined();
    expect(parseSearchParams({ household: "8" }).profile.householdSize).toBe(8);
  });
  it("상세 링크용 '내 조건' 쿼리에 새 항목도 포함한다", () => {
    expect(profileQuery({ household: "2", monthly: "300", asset: "5000", sido: "서울" })).toBe("?household=2&monthly=300&asset=5000");
  });
  it("잘못된 값은 무시한다", () => {
    const p = parseSearchParams({ age: "abc", maxDeposit: "-5", page: "0", sort: "x", sigungu: "강남구" });
    expect(p.hasProfile).toBe(false);
    expect(p.filters.maxDeposit).toBeUndefined();
    expect(p.filters.sigungu).toBeUndefined(); // 시도 없이 시군구만 있으면 무시
    expect(p.page).toBe(1);
    expect(p.sort).toBe("deadline");
  });
  it("쿼리 문자열 조립", () => {
    expect(buildQuery({ a: "1", b: ["x", "y"] }, { page: 2, a: undefined })).toBe("?b=x&b=y&page=2");
    expect(buildQuery({}, {})).toBe("");
    expect(profileQuery({ age: "30", home: "y", sido: "서울" })).toBe("?age=30&home=y");
  });
});
