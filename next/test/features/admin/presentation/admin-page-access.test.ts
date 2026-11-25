import { describe, expect, it, vi, beforeEach } from "vitest";
import { permissionsForRole, resolveAdminPermissions } from "@/features/admin/domain/permissions";
import type { AdminSessionView } from "@/features/admin/application/use-cases/verify-admin-session";
import {
  guardAccountsPage,
  guardDashboard,
  guardPasswordSelf,
  guardSyncPage,
  syncPageFlags,
} from "@/features/admin/presentation/admin-page-access";

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error(`REDIRECT:${url}`), { url });
  },
}));

function session(role: AdminSessionView["role"], override?: Parameters<typeof resolveAdminPermissions>[1]): AdminSessionView {
  const permissions = resolveAdminPermissions(role, override ?? null, false);
  return {
    sessionId: "s",
    loginId: "u",
    role,
    isRoot: false,
    permissions,
  };
}

describe("syncPageFlags", () => {
  it("page none 이면 표·트리거 모두 false", () => {
    const perms = resolveAdminPermissions("viewer", { sync: { housing: { page: "none" } } }, false);
    expect(syncPageFlags(perms, "housing")).toEqual({ canViewSources: false, canViewRuns: false, canTrigger: false });
  });

  it("viewer 는 보기만 된다", () => {
    const f = syncPageFlags(permissionsForRole("viewer"), "housing");
    expect(f.canViewSources).toBe(true);
    expect(f.canTrigger).toBe(false);
  });
});

describe("guard*", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dashboard 없으면 REDIRECT /admin", () => {
    const s = session("viewer", { dashboard: "none" });
    expect(() => guardDashboard(s)).toThrow(/REDIRECT:\/admin/);
  });

  it("accounts 페이지 권한 없으면 REDIRECT", () => {
    expect(() => guardAccountsPage(session("viewer"))).toThrow(/REDIRECT:\/admin/);
  });

  it("passwordSelf none 이면 REDIRECT", () => {
    expect(() => guardPasswordSelf(session("viewer", { passwordSelf: "none" }))).toThrow(/REDIRECT:\/admin/);
  });

  it("sync page none 이면 REDIRECT", () => {
    const s = session("operator", { sync: { jobs: { page: "none" } } });
    expect(() => guardSyncPage(s, "jobs")).toThrow(/REDIRECT:\/admin/);
  });

  it("권한 있으면 redirect 없음", () => {
    expect(() => guardSyncPage(session("operator"), "housing")).not.toThrow();
    expect(() => guardAccountsPage(session("admin"))).not.toThrow();
  });
});