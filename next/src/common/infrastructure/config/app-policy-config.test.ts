import { describe, expect, it } from "vitest";
import { loadAppPolicy } from "./app-policy-config";

describe("loadAppPolicy", () => {
  it("아무것도 없으면 아무도 막지 않는다 (최소 0.0.0)", () => {
    expect(loadAppPolicy({})).toEqual({
      minVersion: [0, 0, 0],
      latestVersion: [0, 0, 0],
      storeUrls: { android: null, ios: null },
      message: null,
    });
  });

  it("값을 읽는다. 빈 문자열은 없는 것으로 본다", () => {
    const policy = loadAppPolicy({
      APP_MIN_VERSION: "1.2.0",
      APP_LATEST_VERSION: "1.4.1",
      APP_STORE_URL_ANDROID: "https://play.google.com/store/apps/details?id=x",
      APP_STORE_URL_IOS: "",
      APP_UPDATE_MESSAGE: " 업데이트해 주세요 ",
    });
    expect(policy).toEqual({
      minVersion: [1, 2, 0],
      latestVersion: [1, 4, 1],
      storeUrls: { android: "https://play.google.com/store/apps/details?id=x", ios: null },
      message: "업데이트해 주세요",
    });
  });

  it("최신 버전을 안 적으면 최소 버전과 같고, 최소보다 낮게 적어도 최소로 맞춘다", () => {
    expect(loadAppPolicy({ APP_MIN_VERSION: "2.0.0" }).latestVersion).toEqual([2, 0, 0]);
    expect(loadAppPolicy({ APP_MIN_VERSION: "2.0.0", APP_LATEST_VERSION: "1.0.0" }).latestVersion).toEqual([2, 0, 0]);
  });

  it("잘못된 값은 조용히 무시하지 않고 오류로 알린다 (강제 업데이트가 조용히 꺼지는 것을 막는다)", () => {
    expect(() => loadAppPolicy({ APP_MIN_VERSION: "abc" })).toThrow(/APP_MIN_VERSION/);
    expect(() => loadAppPolicy({ APP_LATEST_VERSION: "1.x" })).toThrow(/APP_LATEST_VERSION/);
    expect(() => loadAppPolicy({ APP_STORE_URL_IOS: "not a url" })).toThrow();
    expect(() => loadAppPolicy({ APP_STORE_URL_IOS: "javascript:alert(1)" })).toThrow();
  });
});
