import { describe, expect, it } from "vitest";
import { permissionsForRole } from "@/features/admin/domain/permissions";
import { toAdminAccountApiItem } from "@/features/admin/presentation/admin-account-api";
import type { AdminSessionView } from "@/features/admin/application/use-cases/verify-admin-session";

function actor(over: Partial<AdminSessionView["permissions"]["accounts"]> = {}): AdminSessionView {
  const perms = permissionsForRole("admin");
  if (over.page) perms.accounts.page = over.page;
  if (over.fields) Object.assign(perms.accounts.fields, over.fields);
  return {
    sessionId: "s",
    loginId: "adm",
    role: "admin",
    isRoot: false,
    permissions: perms,
  };
}

describe("toAdminAccountApiItem", () => {
  const account = {
    loginId: "target",
    role: "viewer" as const,
    disabled: false,
    isRoot: false,
    permissionsOverride: { sync: { housing: { triggerSync: false } } },
    createdAt: "t",
    updatedAt: "t",
    createdBy: "sup",
  };

  it("permissions 필드 none 이면 effectivePermissions 를 빼낸다", () => {
    const a = actor({ fields: { permissions: "none" } });
    const item = toAdminAccountApiItem(a, account, { verbose: false });
    expect(item.effectivePermissions).toBeUndefined();
    expect(item.hasCustomPermissions).toBe(true);
  });

  it("permissions 필드 edit 이면 effectivePermissions 를 준다", () => {
    const a = actor({ fields: { permissions: "edit" } });
    const item = toAdminAccountApiItem(a, account, { verbose: false });
    expect(item.effectivePermissions?.sync.housing.triggerSync).toBe(false);
  });

  it("permissions view·verbose 요청만으로는 effectivePermissions 를 주지 않는다", () => {
    const a = actor({ fields: { permissions: "view" } });
    const item = toAdminAccountApiItem(a, account, { verbose: true });
    expect(item.effectivePermissions).toBeUndefined();
    expect(item.hasCustomPermissions).toBe(true);
  });
});