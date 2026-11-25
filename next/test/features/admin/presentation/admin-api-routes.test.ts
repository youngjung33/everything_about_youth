import { describe, expect, it } from "vitest";
import { ApiError, ERROR_CODES } from "@/common/presentation/api/errors";
import { setupAdminIntegration, teardownAdminIntegration } from "../admin-integration-fixture";
import { POST as adminLoginPost } from "@/app/api/v1/admin/login/route";
import { GET as adminMeGet } from "@/app/api/v1/admin/me/route";
import { GET as adminAccountsGet } from "@/app/api/v1/admin/accounts/route";
import { POST as adminLogoutPost } from "@/app/api/v1/admin/logout/route";
import { POST as adminPasswordPost } from "@/app/api/v1/admin/password/route";
import { POST as adminAccountsPost } from "@/app/api/v1/admin/accounts/route";
import { PATCH as adminAccountPatch } from "@/app/api/v1/admin/accounts/[loginId]/route";

function readBody<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

describe("admin API routes", () => {
  it("로그인 틀리면 ADMIN_INVALID_CREDENTIALS", async () => {
    const h = setupAdminIntegration();
    try {
      await h.bootstrapAndLogin();
      const res = await adminLoginPost(
        new Request("http://localhost/api/v1/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loginId: "ADMIN", password: "wrong99" }),
        }),
        undefined,
      );
      expect(res.status).toBe(ERROR_CODES.ADMIN_INVALID_CREDENTIALS.status);
      const body = await readBody<{ error: { code: string } }>(res);
      expect(body.error.code).toBe("ADMIN_INVALID_CREDENTIALS");
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });

  it("로그인 성공 시 Set-Cookie 와 loginId", async () => {
    const h = setupAdminIntegration();
    try {
      const res = await adminLoginPost(
        new Request("http://localhost/api/v1/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loginId: "ADMIN", password: "123456" }),
        }),
        undefined,
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("Set-Cookie")).toMatch(/eay_admin_session=/);
      const body = await readBody<{ loginId: string; role: string }>(res);
      expect(body.loginId).toBe("ADMIN");
      expect(body.role).toBe("super");
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });

  it("me 는 쿠키 없으면 401", async () => {
    const h = setupAdminIntegration();
    try {
      const res = await adminMeGet(new Request("http://localhost/api/v1/admin/me"), undefined);
      expect(res.status).toBe(401);
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });

  it("me 는 로그인 쿠키로 permissions 반환", async () => {
    const h = setupAdminIntegration();
    try {
      const cookie = await h.bootstrapAndLogin();
      const res = await adminMeGet(
        new Request("http://localhost/api/v1/admin/me", { headers: { cookie } }),
        undefined,
      );
      expect(res.status).toBe(200);
      const body = await readBody<{ loginId: string; permissions: { accounts: { page: string } } }>(res);
      expect(body.loginId).toBe("ADMIN");
      expect(body.permissions.accounts.page).toBe("edit");
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });

  it("accounts GET 은 viewer 에게 FORBIDDEN", async () => {
    const h = setupAdminIntegration();
    try {
      const { createAdminRepositories } = await import("@/features/admin/infrastructure/persistence/sqlite/admin-repositories");
      const { insertTestAdmin } = await import("../admin-db-fixture");
      const { accounts } = createAdminRepositories(h.conn.db, { now: () => new Date("2026-06-01T12:00:00.000Z") });
      await insertTestAdmin(accounts, "v", "viewer");
      const cookie = await h.loginAs("v", "secret12");
      const res = await adminAccountsGet(new Request("http://localhost/api/v1/admin/accounts", { headers: { cookie } }), undefined);
      expect(res.status).toBe(403);
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });

  it("password POST 는 viewer 쿠키로 weak 시 400", async () => {
    const h = setupAdminIntegration();
    try {
      const { createAdminRepositories } = await import("@/features/admin/infrastructure/persistence/sqlite/admin-repositories");
      const { insertTestAdmin } = await import("../admin-db-fixture");
      const { accounts } = createAdminRepositories(h.conn.db, { now: () => new Date("2026-06-01T12:00:00.000Z") });
      await insertTestAdmin(accounts, "v", "viewer");
      const cookie = await h.loginAs("v", "secret12");
      const res = await adminPasswordPost(
        new Request("http://localhost/api/v1/admin/password", {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie },
          body: JSON.stringify({ currentPassword: "secret12", newPassword: "12345" }),
        }),
        undefined,
      );
      expect(res.status).toBe(400);
      const body = await readBody<{ error: { code: string } }>(res);
      expect(body.error.code).toBe("ADMIN_WEAK_PASSWORD");
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });

  it("ROOT 계정 PATCH 비활성은 ADMIN_ROOT_PROTECTED", async () => {
    const h = setupAdminIntegration();
    try {
      const cookie = await h.bootstrapAndLogin();
      const res = await adminAccountPatch(
        new Request("http://localhost/api/v1/admin/accounts/ADMIN", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", cookie },
          body: JSON.stringify({ disabled: true }),
        }),
        { params: Promise.resolve({ loginId: "ADMIN" }) },
      );
      expect(res.status).toBe(403);
      const body = await readBody<{ error: { code: string } }>(res);
      expect(body.error.code).toBe("ADMIN_ROOT_PROTECTED");
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });

  it("super 로 계정 POST 성공", async () => {
    const h = setupAdminIntegration();
    try {
      const cookie = await h.bootstrapAndLogin();
      const res = await adminAccountsPost(
        new Request("http://localhost/api/v1/admin/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie },
          body: JSON.stringify({ loginId: "newop", password: "secret12", role: "operator" }),
        }),
        undefined,
      );
      expect(res.status).toBe(201);
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });

  it("logout 은 쿠키 없어도 200", async () => {
    const h = setupAdminIntegration();
    try {
      const res = await adminLogoutPost(new Request("http://localhost/api/v1/admin/logout", { method: "POST" }), undefined);
      expect(res.status).toBe(200);
      expect(res.headers.get("Set-Cookie")).toMatch(/Max-Age=0/);
    } finally {
      teardownAdminIntegration(h.conn);
    }
  });
});