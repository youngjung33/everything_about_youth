import { describe, expect, it } from "vitest";
import {
  ADMIN_SYNC_SECTIONS,
  canOpenAccountsPage,
  canOpenSyncPage,
  canTriggerSync,
  hasAnyAdminAccess,
  isPermissionsSubset,
  parsePermissionsOverride,
  permissionsForRole,
  resolveAdminPermissions,
} from "@/features/admin/domain/permissions";
import { canAdminPermission } from "@/features/admin/domain/role";

describe("parsePermissionsOverride", () => {
  it("잘못된 JSON 은 null", () => {
    expect(parsePermissionsOverride("{")).toBeNull();
    expect(parsePermissionsOverride("")).toBeNull();
  });

  it("null·빈 문자열은 null", () => {
    expect(parsePermissionsOverride(null)).toBeNull();
    expect(parsePermissionsOverride("   ")).toBeNull();
  });
});

describe("hasAnyAdminAccess", () => {
  it("모든 페이지가 none 이면 false", () => {
    const sync = Object.fromEntries(ADMIN_SYNC_SECTIONS.map((s) => [s, { page: "none" as const }]));
    const perms = resolveAdminPermissions(
      "viewer",
      { dashboard: "none", passwordSelf: "none", accounts: { page: "none" }, sync },
      false,
    );
    expect(hasAnyAdminAccess(perms)).toBe(false);
  });

  it("수집 페이지 하나만 있어도 true", () => {
    expect(hasAnyAdminAccess(permissionsForRole("viewer"))).toBe(true);
  });
});

describe("resolveAdminPermissions", () => {
  it("isRoot 이면 override 무시하고 전체 권한", () => {
    const perms = resolveAdminPermissions("viewer", { dashboard: "none" }, true);
    expect(perms.dashboard).toBe("edit");
    expect(canTriggerSync(perms, "housing")).toBe(true);
  });

  it("override 로 섹션 수집만 끌 수 있다", () => {
    const perms = resolveAdminPermissions("operator", { sync: { housing: { triggerSync: false } } }, false);
    expect(canTriggerSync(perms, "housing")).toBe(false);
    expect(canTriggerSync(perms, "benefits")).toBe(true);
  });
});

describe("isPermissionsSubset", () => {
  it("viewer 템플릿은 operator 권한의 부분집합", () => {
    expect(isPermissionsSubset(permissionsForRole("viewer"), permissionsForRole("operator"))).toBe(true);
  });

  it("super 템플릿은 operator 의 부분집합이 아니다", () => {
    expect(isPermissionsSubset(permissionsForRole("super"), permissionsForRole("operator"))).toBe(false);
  });
});

describe("canAdminPermission", () => {
  it("viewer 는 housing 수집 실행 불가", () => {
    expect(canAdminPermission(permissionsForRole("viewer"), "sync_trigger", { section: "housing" })).toBe(false);
    expect(canOpenSyncPage(permissionsForRole("viewer"), "housing")).toBe(true);
  });

  it("operator 는 housing 수집 실행 가능", () => {
    expect(canAdminPermission(permissionsForRole("operator"), "sync_trigger", { section: "housing" })).toBe(true);
  });

  it("admin 은 account_list·create 가능", () => {
    const p = permissionsForRole("admin");
    expect(canAdminPermission(p, "account_list")).toBe(true);
    expect(canAdminPermission(p, "account_create")).toBe(true);
    expect(canAdminPermission(p, "password_reset_other")).toBe(false);
    expect(canOpenAccountsPage(p)).toBe(true);
  });
});