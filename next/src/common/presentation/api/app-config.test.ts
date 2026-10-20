import { describe, expect, it } from "vitest";
import type { AppPolicy } from "@/common/application/app-policy";
import { parseAppVersion } from "@/common/domain/app-version";
import { handleGetAppConfig } from "./app-config";

const v = (s: string) => parseAppVersion(s)!;
const policy: AppPolicy = {
  minVersion: v("1.2.0"),
  latestVersion: v("1.3.0"),
  storeUrls: { android: "https://play.google.com/x", ios: null },
  message: "새 버전이 필요합니다.",
};

describe("GET /api/v1/app-config", () => {
  it("강제 업데이트 대상이면 required 와 스토어 주소, 문구를 준다", () => {
    const { status, body } = handleGetAppConfig({ version: "1.0.0", platform: "android" }, policy);
    expect(status).toBe(200);
    expect(body).toEqual({
      api: { version: "v1" },
      update: {
        status: "required",
        minVersion: "1.2.0",
        latestVersion: "1.3.0",
        storeUrl: "https://play.google.com/x",
        message: "새 버전이 필요합니다.",
      },
    });
  });

  it("권장/최신/모름을 구분한다", () => {
    expect(handleGetAppConfig({ version: "1.2.5", platform: "ios" }, policy).body.update.status).toBe("optional");
    expect(handleGetAppConfig({ version: "1.3.0", platform: "ios" }, policy).body.update.status).toBe("none");
    expect(handleGetAppConfig({ version: null, platform: null }, policy).body.update.status).toBe("none");
  });

  it("스토어 주소가 없는 플랫폼은 null", () => {
    expect(handleGetAppConfig({ version: "1.0.0", platform: "ios" }, policy).body.update.storeUrl).toBeNull();
  });
});
