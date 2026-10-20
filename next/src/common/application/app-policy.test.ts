import { describe, expect, it } from "vitest";
import { parseAppVersion } from "@/common/domain/app-version";
import { evaluateUpdateFromHeaders, normalizePlatform, type AppPolicy } from "./app-policy";

const v = (s: string) => parseAppVersion(s)!;
const policy: AppPolicy = {
  minVersion: v("1.2.0"),
  latestVersion: v("1.4.0"),
  storeUrls: { android: "https://play.google.com/x", ios: "https://apps.apple.com/y" },
  message: null,
};

const decide = (version: string | null, platform: string | null) =>
  evaluateUpdateFromHeaders({ version, platform }, policy);

describe("evaluateUpdate", () => {
  it("최소 버전 미만이면 required, 스토어 주소는 플랫폼에 맞게", () => {
    expect(decide("1.1.9", "android")).toEqual({ status: "required", storeUrl: "https://play.google.com/x" });
    expect(decide("1.0.0", "ios")).toEqual({ status: "required", storeUrl: "https://apps.apple.com/y" });
  });

  it("최소 이상 최신 미만이면 optional", () => {
    expect(decide("1.2.0", "android").status).toBe("optional");
    expect(decide("1.3.9", "ios").status).toBe("optional");
  });

  it("최신 이상이면 none", () => {
    expect(decide("1.4.0", "android").status).toBe("none");
    expect(decide("2.0.0", "ios").status).toBe("none");
  });

  it("웹은 서버와 같이 배포되므로 막지 않는다", () => {
    expect(decide("0.0.1", "web")).toEqual({ status: "none", storeUrl: null });
  });

  it("버전을 모르거나 형식이 틀리거나 플랫폼을 모르는 클라이언트(스크립트 등)는 막지 않는다", () => {
    expect(decide(null, "android").status).toBe("none");
    expect(decide("garbage", "android").status).toBe("none");
    expect(decide("1.0.0", null).status).toBe("required"); // 플랫폼 미상이어도 버전이 낮으면 막는다(웹만 예외)
  });

  it("normalizePlatform 은 알려진 값만 받는다", () => {
    expect(normalizePlatform(" ANDROID ")).toBe("android");
    expect(normalizePlatform("ios")).toBe("ios");
    expect(normalizePlatform("web")).toBe("web");
    expect(normalizePlatform("windows")).toBe("unknown");
    expect(normalizePlatform(null)).toBe("unknown");
  });
});
