import { describe, expect, it } from "vitest";
import { loadAdminBootstrapConfig } from "@/features/admin/infrastructure/config/admin-config";

describe("loadAdminBootstrapConfig", () => {
  it("6자 미만 비밀번호는 오류", () => {
    expect(() =>
      loadAdminBootstrapConfig({ NODE_ENV: "test", ADMIN_BOOTSTRAP_PASSWORD: "12345" }),
    ).toThrow();
  });

  it("운영에서 비밀번호 없으면 오류", () => {
    expect(() => loadAdminBootstrapConfig({ NODE_ENV: "production", ADMIN_BOOTSTRAP_PASSWORD: undefined })).toThrow(
      /ADMIN_BOOTSTRAP_PASSWORD/,
    );
  });

  it("env 로 아이디·비밀번호를 읽는다", () => {
    const c = loadAdminBootstrapConfig({
      NODE_ENV: "test",
      ADMIN_BOOTSTRAP_LOGIN_ID: "ROOT",
      ADMIN_BOOTSTRAP_PASSWORD: "setup99",
    });
    expect(c.loginId).toBe("ROOT");
    expect(c.password).toBe("setup99");
  });
});