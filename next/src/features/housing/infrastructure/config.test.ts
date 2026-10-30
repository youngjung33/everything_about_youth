import { describe, expect, it } from "vitest";
import { MIN_SYNC_INTERVAL_MINUTES, loadHousingConfig } from "./config";

describe("loadHousingConfig", () => {
  it("HOUSING_SYNC_INTERVAL_MINUTES 가 1~29 이면 Error", () => {
    expect(() => loadHousingConfig({ HOUSING_SYNC_INTERVAL_MINUTES: "15" })).toThrow(
      new RegExp(String(MIN_SYNC_INTERVAL_MINUTES)),
    );
    expect(() => loadHousingConfig({ HOUSING_SYNC_INTERVAL_MINUTES: "1" })).toThrow(/0\(끔\)/);
  });

  it("잘못된 HOUSING_SYNC_SOURCES 는 parseSourceList Error", () => {
    expect(() => loadHousingConfig({ HOUSING_SYNC_SOURCES: "lh,bogus" })).toThrow(/알 수 없는 소스/);
  });

  it("0 이면 자동 수집 끔, 30 이상이면 허용", () => {
    expect(loadHousingConfig({})).toEqual({ enabledSources: [], syncIntervalMinutes: 0 });
    expect(loadHousingConfig({ HOUSING_SYNC_INTERVAL_MINUTES: "0" }).syncIntervalMinutes).toBe(0);
    expect(loadHousingConfig({ HOUSING_SYNC_INTERVAL_MINUTES: "30" }).syncIntervalMinutes).toBe(30);
    expect(loadHousingConfig({ HOUSING_SYNC_SOURCES: "lh,sh" }).enabledSources).toEqual(["lh", "sh"]);
  });
});
