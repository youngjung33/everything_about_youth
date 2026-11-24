import { describe, expect, it } from "vitest";
import { openSqlite, runMigrations } from "@/common/infrastructure/persistence/sqlite/client";
import { systemClock } from "@/common/application/system";
import { AdminAccountError, AdminAuthError } from "@/features/admin/application/admin-errors";
import { ChangeAdminPassword } from "@/features/admin/application/use-cases/change-admin-password";
import { verifyAdminPassword } from "@/features/admin/domain/password";
import { createAdminRepositories } from "@/features/admin/infrastructure/persistence/sqlite/admin-repositories";
import { insertTestAdmin } from "../../admin-db-fixture";

describe("ChangeAdminPassword", () => {
  it("현재 비밀번호가 틀리면 invalid", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "u", "viewer");
    const change = new ChangeAdminPassword(accounts);
    await expect(change.execute("u", "wrong", "newpass9", "t2")).rejects.toMatchObject({ reason: "invalid" });
    conn.close();
  });

  it("새 비밀번호가 짧으면 weak_password", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "u", "viewer");
    const change = new ChangeAdminPassword(accounts);
    await expect(change.execute("u", "secret12", "12345", "t2")).rejects.toMatchObject({ reason: "weak_password" });
    conn.close();
  });

  it("존재하지 않는 loginId 면 not_found", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    const change = new ChangeAdminPassword(accounts);
    await expect(change.execute("nobody", "secret12", "newpass9", "t2")).rejects.toMatchObject({ reason: "invalid" });
    conn.close();
  });

  it("정상 변경 시 새 비밀번호로 검증된다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "u", "viewer");
    const change = new ChangeAdminPassword(accounts);
    await change.execute("u", "secret12", "newpass9", "t2");
    const hash = await accounts.findPasswordHash("u");
    expect(hash).toBeTruthy();
    expect(verifyAdminPassword("newpass9", hash!)).toBe(true);
    conn.close();
  });
});