import { describe, expect, it } from "vitest";
import { openSqlite, runMigrations } from "@/common/infrastructure/persistence/sqlite/client";
import { systemClock } from "@/common/application/system";
import { ensureBootstrapAdmin } from "@/features/admin/application/use-cases/ensure-bootstrap-admin";
import { verifyAdminPassword } from "@/features/admin/domain/password";
import { createAdminRepositories } from "@/features/admin/infrastructure/persistence/sqlite/admin-repositories";
import { insertTestAdmin } from "../../admin-db-fixture";

describe("ensureBootstrapAdmin", () => {
  it("이미 계정이 있으면 추가하지 않는다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "existing", "admin");
    expect(accounts.count()).toBe(1);
    await ensureBootstrapAdmin(accounts, "t");
    expect(accounts.count()).toBe(1);
    conn.close();
  });

  it("비어 있으면 env 기반 루트 super 를 만든다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await ensureBootstrapAdmin(accounts, "t");
    const row = await accounts.findByLoginId("ADMIN");
    expect(row?.role).toBe("super");
    expect(row?.isRoot).toBe(true);
    const hash = await accounts.findPasswordHash("ADMIN");
    expect(verifyAdminPassword("123456", hash!)).toBe(true);
    conn.close();
  });
});