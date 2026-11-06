import { describe, expect, it } from "vitest";
import { MIN_SYNC_INTERVAL_MINUTES, loadLivingConfig } from "./config";

describe("loadLivingConfig", () => {
  it("LIVING_SYNC_INTERVAL_MINUTES 가 1~29 이면 Error", () => {
    expect(() => loadLivingConfig({ LIVING_SYNC_INTERVAL_MINUTES: "15" })).toThrow(new RegExp(String(MIN_SYNC_INTERVAL_MINUTES)));
  });

  it("잘못된 LIVING_SYNC_SOURCES 는 parseSourceList Error", () => {
    expect(() => loadLivingConfig({ LIVING_SYNC_SOURCES: "bogus" })).toThrow(/알 수 없는 소스/);
  });

  it("0 이면 자동 수집 끔, 30 이상이면 허용", () => {
    expect(loadLivingConfig({})).toEqual({ enabledSources: [], syncIntervalMinutes: 0 });
    expect(loadLivingConfig({ LIVING_SYNC_INTERVAL_MINUTES: "30" }).syncIntervalMinutes).toBe(30);
    expect(loadLivingConfig({ LIVING_SYNC_SOURCES: "curated,curated" }).enabledSources).toEqual(["curated"]);
  });
});
