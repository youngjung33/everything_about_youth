import { describe, expect, it } from "vitest";
import { MIN_SYNC_INTERVAL_MINUTES, loadBenefitsConfig } from "./config";

describe("loadBenefitsConfig", () => {
  it("BENEFITS_SYNC_INTERVAL_MINUTES 가 1~29 이면 Error", () => {
    expect(() => loadBenefitsConfig({ BENEFITS_SYNC_INTERVAL_MINUTES: "15" })).toThrow(new RegExp(String(MIN_SYNC_INTERVAL_MINUTES)));
  });

  it("잘못된 BENEFITS_SYNC_SOURCES 는 parseSourceList Error", () => {
    expect(() => loadBenefitsConfig({ BENEFITS_SYNC_SOURCES: "ontong,bogus" })).toThrow(/알 수 없는 소스/);
  });

  it("0 이면 자동 수집 끔, 30 이상이면 허용", () => {
    expect(loadBenefitsConfig({})).toEqual({ enabledSources: [], syncIntervalMinutes: 0, ontongApiKey: undefined });
    expect(loadBenefitsConfig({ BENEFITS_SYNC_INTERVAL_MINUTES: "30" }).syncIntervalMinutes).toBe(30);
    expect(loadBenefitsConfig({ BENEFITS_SYNC_SOURCES: "ontong", BENEFITS_ONTONG_API_KEY: "k" }).enabledSources).toEqual(["ontong"]);
  });
});
