import { describe, expect, it } from "vitest";
import { loadRuntimeEnv } from "./runtime-env-config";

describe("loadRuntimeEnv", () => {
  it("개발에서는 APP_ENV 없으면 dev", () => {
    expect(loadRuntimeEnv({ NODE_ENV: "development" }).appEnv).toBe("dev");
    expect(loadRuntimeEnv({}).appEnv).toBe("dev");
  });

  it("운영에서는 APP_ENV 가 필수다", () => {
    expect(() => loadRuntimeEnv({ NODE_ENV: "production" })).toThrow(/APP_ENV/);
    expect(loadRuntimeEnv({ NODE_ENV: "production", APP_ENV: "stage" }).appEnv).toBe("stage");
  });
});
