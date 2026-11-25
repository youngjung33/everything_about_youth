import { describe, expect, it } from "vitest";
import { ApiError } from "@/common/presentation/api/errors";
import { AdminAccountError, AdminAuthError } from "@/features/admin/application/admin-errors";
import { mapAdminAccountError, mapAdminLoginError, requireAdminApi } from "@/features/admin/presentation/admin-auth";
import { setupAdminIntegration, seedViewerSession, teardownAdminIntegration } from "../admin-integration-fixture";

describe("mapAdminLoginError", () => {
  it("AdminAuthError 는 ADMIN_INVALID_CREDENTIALS", () => {
    expect(() => mapAdminLoginError(new AdminAuthError("invalid"))).toThrowError(
      expect.objectContaining({ code: "ADMIN_INVALID_CREDENTIALS" }),
    );
  });

  it("알 수 없는 오류는 그대로 전파", () => {
    expect(() => mapAdminLoginError(new Error("x"))).toThrow("x");
  });
});

describe("mapAdminAccountError", () => {
  const cases: Array<[AdminAccountError["reason"], string]> = [
    ["exists", "ADMIN_ACCOUNT_EXISTS"],
    ["weak_password", "ADMIN_WEAK_PASSWORD"],
    ["last_super", "ADMIN_LAST_SUPER"],
    ["root_protected", "ADMIN_ROOT_PROTECTED"],
    ["permission_exceeds", "ADMIN_PERMISSION_EXCEEDS"],
    ["not_found", "NOT_FOUND"],
    ["forbidden", "FORBIDDEN"],
  ];

  for (const [reason, code] of cases) {
    it(`AdminAccountError ${reason} → ${code}`, () => {
      expect(() => mapAdminAccountError(new AdminAccountError(reason))).toThrowError(
        expect.objectContaining({ code }),
      );
    });
  }
});

describe("requireAdminApi", () => {
  it("쿠키 없으면 ADMIN_AUTH_REQUIRED", async () => {
    const h = setupAdminIntegration();
    try {
      const req = new Request("http://localhost/api/v1/admin/me");
      await expect(requireAdminApi(req, "sync_view")).rejects.toThrowError(
        expect.objectContaining({ code: "ADMIN_AUTH_REQUIRED" }),
      );
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });

  it("viewer 는 account_create 에서 FORBIDDEN", async () => {
    const h = setupAdminIntegration();
    try {
      const cookie = await seedViewerSession(h);
      const req = new Request("http://localhost/api/v1/admin/accounts", { headers: { cookie } });
      await expect(requireAdminApi(req, "account_create")).rejects.toThrowError(
        expect.objectContaining({ code: "FORBIDDEN" }),
      );
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });

  it("viewer 는 housing 수집 트리거 불가", async () => {
    const h = setupAdminIntegration();
    try {
      const cookie = await seedViewerSession(h);
      const req = new Request("http://localhost/api/v1/housing/sync", { headers: { cookie } });
      await expect(requireAdminApi(req, "sync_trigger", { section: "housing" })).rejects.toThrowError(
        expect.objectContaining({ code: "FORBIDDEN" }),
      );
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });

  it("operator 쿠키·DB 세션이면 housing sync_trigger 허용", async () => {
    const h = setupAdminIntegration();
    try {
      const { accounts, sessions } = await import("@/features/admin/infrastructure/persistence/sqlite/admin-repositories").then(
        (m) => m.createAdminRepositories(h.conn.db, { now: () => new Date("2026-06-01T12:00:00.000Z") }),
      );
      const { insertTestAdmin } = await import("../admin-db-fixture");
      await insertTestAdmin(accounts, "op", "operator");
      const sid = "sid-op";
      await sessions.create(sid, "op", "2030-01-01T00:00:00.000Z", "2026-06-01T12:00:00.000Z");
      const cookie = await h.cookieHeader(sid, "op", "operator");
      const session = await requireAdminApi(
        new Request("http://localhost/x", { headers: { cookie } }),
        "sync_trigger",
        { section: "housing" },
      );
      expect(session.loginId).toBe("op");
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });

  it("만료·폐기 세션이면 ADMIN_AUTH_REQUIRED", async () => {
    const h = setupAdminIntegration();
    try {
      const cookie = await h.cookieHeader("sid-ghost", "ghost", "viewer");
      await expect(
        requireAdminApi(new Request("http://localhost/x", { headers: { cookie } }), "sync_view"),
      ).rejects.toThrowError(expect.objectContaining({ code: "ADMIN_AUTH_REQUIRED" }));
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });
});