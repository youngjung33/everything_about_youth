import { describe, expect, it } from "vitest";
import { openSqlite, runMigrations } from "@/common/infrastructure/persistence/sqlite/client";
import { systemClock } from "@/common/application/system";
import { AdminAuthError } from "@/features/admin/application/admin-errors";
import { LoginAdmin } from "@/features/admin/application/use-cases/login-admin";
import { ensureBootstrapAdmin } from "@/features/admin/application/use-cases/ensure-bootstrap-admin";
import { hashAdminPassword } from "@/features/admin/domain/password";
import { createAdminRepositories } from "@/features/admin/infrastructure/persistence/sqlite/admin-repositories";

describe("LoginAdmin", () => {
  it("빈 아이디·비밀번호는 invalid", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts, sessions } = createAdminRepositories(conn.db, systemClock);
    const login = new LoginAdmin(accounts, sessions, () => "sid", 60_000);
    await expect(login.execute("", "secret12", "t", 0)).rejects.toMatchObject({ reason: "invalid" });
    await expect(login.execute("u", "", "t", 0)).rejects.toMatchObject({ reason: "invalid" });
    conn.close();
  });

  it("없는 계정은 invalid", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts, sessions } = createAdminRepositories(conn.db, systemClock);
    const login = new LoginAdmin(accounts, sessions, () => "sid", 60_000);
    await expect(login.execute("nobody", "secret12", "t", 0)).rejects.toMatchObject({ reason: "invalid" });
    conn.close();
  });

  it("비활성 계정은 disabled", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts, sessions } = createAdminRepositories(conn.db, systemClock);
    await accounts.insert(
      {
        loginId: "x",
        role: "viewer",
        disabled: true,
        isRoot: false,
        permissionsOverride: null,
        createdAt: "t",
        updatedAt: "t",
        createdBy: null,
      },
      hashAdminPassword("secret12"),
    );
    const login = new LoginAdmin(accounts, sessions, () => "sid-3", 60_000);
    await expect(login.execute("x", "secret12", "t", 0)).rejects.toMatchObject({ reason: "disabled" });
    conn.close();
  });

  it("틀린 비밀번호는 invalid", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts, sessions } = createAdminRepositories(conn.db, systemClock);
    await accounts.insert(
      {
        loginId: "op1",
        role: "operator",
        disabled: false,
        isRoot: false,
        permissionsOverride: null,
        createdAt: "t",
        updatedAt: "t",
        createdBy: null,
      },
      hashAdminPassword("secret12"),
    );
    const login = new LoginAdmin(accounts, sessions, () => "sid-1", 60_000);
    await expect(login.execute("op1", "nope", "t", Date.now())).rejects.toBeInstanceOf(AdminAuthError);
    conn.close();
  });

  it("ensureBootstrapAdmin 후 ADMIN 으로 로그인", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts, sessions } = createAdminRepositories(conn.db, systemClock);
    await ensureBootstrapAdmin(accounts, "2026-01-01T00:00:00.000Z");
    const login = new LoginAdmin(accounts, sessions, () => "sid-2", 60_000);
    const out = await login.execute("ADMIN", "123456", "2026-01-01T00:00:00.000Z", Date.parse("2026-01-01T00:00:00.000Z"));
    expect(out.loginId).toBe("ADMIN");
    expect(out.role).toBe("super");
    conn.close();
  });
});