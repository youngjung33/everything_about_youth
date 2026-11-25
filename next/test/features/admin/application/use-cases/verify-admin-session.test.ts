import { describe, expect, it } from "vitest";
import { openSqlite, runMigrations } from "@/common/infrastructure/persistence/sqlite/client";
import { systemClock } from "@/common/application/system";
import { AdminSessionError } from "@/features/admin/application/admin-errors";
import { VerifyAdminSession } from "@/features/admin/application/use-cases/verify-admin-session";
import { createAdminRepositories } from "@/features/admin/infrastructure/persistence/sqlite/admin-repositories";
import { insertTestAdmin } from "../../admin-db-fixture";

describe("VerifyAdminSession", () => {
  it("sessionId 가 비어 있으면 missing", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts, sessions } = createAdminRepositories(conn.db, systemClock);
    const verify = new VerifyAdminSession(accounts, sessions);
    await expect(verify.execute("", "2026-01-01T12:00:00.000Z")).rejects.toMatchObject({ reason: "missing" });
    conn.close();
  });

  it("만료된 세션이면 expired", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts, sessions } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "u1", "viewer");
    await sessions.create("sid-exp", "u1", "2026-01-01T10:00:00.000Z", "2026-01-01T09:00:00.000Z");
    const verify = new VerifyAdminSession(accounts, sessions);
    await expect(verify.execute("sid-exp", "2026-01-01T12:00:00.000Z")).rejects.toMatchObject({ reason: "expired" });
    conn.close();
  });

  it("비활성 계정이면 revoked", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts, sessions } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "off", "viewer", "secret12", { disabled: true });
    await sessions.create("sid-off", "off", "2030-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
    const verify = new VerifyAdminSession(accounts, sessions);
    await expect(verify.execute("sid-off", "2026-01-01T00:00:00.000Z")).rejects.toMatchObject({ reason: "revoked" });
    conn.close();
  });

  it("revoke 된 세션이면 expired", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts, sessions } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "u1", "viewer");
    await sessions.create("sid-rev", "u1", "2030-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
    await sessions.revoke("sid-rev");
    const verify = new VerifyAdminSession(accounts, sessions);
    await expect(verify.execute("sid-rev", "2026-01-01T00:00:00.000Z")).rejects.toMatchObject({ reason: "expired" });
    conn.close();
  });

  it("유효한 세션이면 권한을 포함해 반환", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts, sessions } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "op", "operator");
    await sessions.create("sid-ok", "op", "2030-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
    const verify = new VerifyAdminSession(accounts, sessions);
    const view = await verify.execute("sid-ok", "2026-01-01T00:00:00.000Z");
    expect(view.loginId).toBe("op");
    expect(view.permissions.sync.housing.triggerSync).toBe(true);
    conn.close();
  });
});