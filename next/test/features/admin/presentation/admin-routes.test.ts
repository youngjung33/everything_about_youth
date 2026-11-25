import { describe, expect, it } from "vitest";
import { ADMIN_LOGIN_PATH, isAdminPagePath } from "@/features/admin/presentation/routes";

describe("isAdminPagePath", () => {
  it("로그인 경로는 관리자 보호 대상이 아니다", () => {
    expect(isAdminPagePath(ADMIN_LOGIN_PATH)).toBe(false);
  });

  it("비관리자 경로는 false", () => {
    expect(isAdminPagePath("/housing")).toBe(false);
    expect(isAdminPagePath("/api/v1/admin/login")).toBe(false);
  });

  it("관리자·섹션 admin prefix 는 true", () => {
    expect(isAdminPagePath("/admin")).toBe(true);
    expect(isAdminPagePath("/admin/accounts")).toBe(true);
    expect(isAdminPagePath("/housing/admin/sync")).toBe(true);
    expect(isAdminPagePath("/living/admin/sync")).toBe(true);
  });
});