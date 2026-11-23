import { describe, expect, it } from "vitest";
import { canAdmin, canManageRole, parseAdminRole } from "@/features/admin/domain/role";

describe("parseAdminRole", () => {
  it("알 수 없는 문자열은 null", () => {
    expect(parseAdminRole("owner")).toBeNull();
    expect(parseAdminRole("")).toBeNull();
  });

  it("등록된 등급만 받아들인다", () => {
    expect(parseAdminRole("super")).toBe("super");
    expect(parseAdminRole("viewer")).toBe("viewer");
  });
});

describe("canAdmin", () => {
  it("viewer 는 수집 실행을 할 수 없다", () => {
    expect(canAdmin("viewer", "sync_trigger")).toBe(false);
    expect(canAdmin("viewer", "sync_view")).toBe(true);
  });

  it("operator 는 수집을 실행할 수 있다", () => {
    expect(canAdmin("operator", "sync_trigger")).toBe(true);
    expect(canAdmin("operator", "account_create")).toBe(false);
  });

  it("super 는 계정·수집 모두", () => {
    expect(canAdmin("super", "password_reset_other")).toBe(true);
    expect(canAdmin("admin", "password_reset_other")).toBe(false);
  });
});

describe("canManageRole", () => {
  it("admin 은 super 를 만들 수 없다", () => {
    expect(canManageRole("admin", "operator")).toBe(true);
    expect(canManageRole("admin", "super")).toBe(false);
  });

  it("super 는 모든 등급 관리", () => {
    expect(canManageRole("super", "admin")).toBe(true);
  });
});