import { describe, expect, it } from "vitest";
import { MIN_SYNC_INTERVAL_MINUTES, loadJobsConfig } from "./config";

describe("loadJobsConfig", () => {
  it("JOBS_SYNC_INTERVAL_MINUTES 가 1~29 이면 Error", () => {
    expect(() => loadJobsConfig({ JOBS_SYNC_INTERVAL_MINUTES: "15" })).toThrow(new RegExp(String(MIN_SYNC_INTERVAL_MINUTES)));
  });

  it("잘못된 JOBS_SYNC_SOURCES 는 parseSourceList Error", () => {
    expect(() => loadJobsConfig({ JOBS_SYNC_SOURCES: "curated,bogus" })).toThrow(/알 수 없는 소스/);
  });

  it("0 이면 자동 수집 끔, 30 이상이면 허용", () => {
    expect(loadJobsConfig({})).toEqual({ enabledSources: [], syncIntervalMinutes: 0 });
    expect(loadJobsConfig({ JOBS_SYNC_INTERVAL_MINUTES: "30" }).syncIntervalMinutes).toBe(30);
    expect(loadJobsConfig({ JOBS_SYNC_SOURCES: "curated,demo" }).enabledSources).toEqual(["curated", "demo"]);
  });
});
