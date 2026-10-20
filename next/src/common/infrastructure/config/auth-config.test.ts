import { describe, expect, it, vi } from "vitest";
import { loadAuthConfig } from "./auth-config";

describe("loadAuthConfig", () => {
  it("개발에서는 키가 없어도 임시 키와 기본값으로 동작한다", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const c = loadAuthConfig({ NODE_ENV: "development" });
    expect(c.secret.length).toBeGreaterThanOrEqual(32);
    expect(c).toMatchObject({ accessTtlSec: 900, refreshTtlSec: 30 * 24 * 3600 });
  });

  it("운영에서는 JWT_SECRET 이 없거나 짧으면 시작하지 않는다", () => {
    expect(() => loadAuthConfig({ NODE_ENV: "production" })).toThrow("JWT_SECRET");
    expect(() => loadAuthConfig({ NODE_ENV: "production", JWT_SECRET: "" })).toThrow("JWT_SECRET");
    expect(() => loadAuthConfig({ NODE_ENV: "production", JWT_SECRET: "short" })).toThrow("32자");
  });

  it("운영에서 충분히 긴 키와 TTL 설정을 읽는다", () => {
    const c = loadAuthConfig({
      NODE_ENV: "production",
      JWT_SECRET: "x".repeat(40),
      JWT_ACCESS_TTL_SEC: "60",
      JWT_ISSUER: "me",
    });
    expect(c).toMatchObject({ secret: "x".repeat(40), accessTtlSec: 60, issuer: "me" });
  });

  it("너무 짧은 만료 시간은 거절한다", () => {
    expect(() => loadAuthConfig({ JWT_SECRET: "x".repeat(40), JWT_ACCESS_TTL_SEC: "1" })).toThrow();
  });
});
