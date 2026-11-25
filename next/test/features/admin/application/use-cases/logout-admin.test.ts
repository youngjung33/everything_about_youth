import { describe, expect, it } from "vitest";
import { openSqlite, runMigrations } from "@/common/infrastructure/persistence/sqlite/client";
import { systemClock } from "@/common/application/system";
import { LogoutAdmin } from "@/features/admin/application/use-cases/logout-admin";
import { VerifyAdminSession } from "@/features/admin/application/use-cases/verify-admin-session";
import { AdminSessionError } from "@/features/admin/application/admin-errors";
import { createAdminRepositories } from "@/features/admin/infrastructure/persistence/sqlite/admin-repositories";
import { insertTestAdmin } from "../../admin-db-fixture";

describe("LogoutAdmin", () => {
  it("빈 sessionId 는 무시한다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { sessions } = createAdminRepositories(conn.db, systemClock);
    const logout = new LogoutAdmin(sessions);
    await expect(logout.execute("")).resolves.toBeUndefined();
    conn.close();
  });

  it("logout 후 verify 는 expired", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts, sessions } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "u", "viewer");
    const sid = "sid-logout";
    await sessions.create(sid, "u", "2030-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z");
    const logout = new LogoutAdmin(sessions);
    const verify = new VerifyAdminSession(accounts, sessions);
    await logout.execute(sid);
    await expect(verify.execute(sid, "2026-01-01T12:00:00.000Z")).rejects.toMatchObject({ reason: "expired" });
    conn.close();
  });
});