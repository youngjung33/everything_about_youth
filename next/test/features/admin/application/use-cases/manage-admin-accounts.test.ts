import { describe, expect, it } from "vitest";
import { openSqlite, runMigrations } from "@/common/infrastructure/persistence/sqlite/client";
import { systemClock } from "@/common/application/system";
import { AdminAccountError } from "@/features/admin/application/admin-errors";
import { CreateAdminAccount, UpdateAdminAccount } from "@/features/admin/application/use-cases/manage-admin-accounts";
import { ensureBootstrapAdmin } from "@/features/admin/application/use-cases/ensure-bootstrap-admin";
import { hashAdminPassword } from "@/features/admin/domain/password";
import { permissionsForRole } from "@/features/admin/domain/permissions";
import { createAdminRepositories } from "@/features/admin/infrastructure/persistence/sqlite/admin-repositories";
import { insertTestAdmin } from "../../admin-db-fixture";

function superActor(loginId = "sup") {
  return { loginId, role: "super" as const, permissions: permissionsForRole("super") };
}

describe("CreateAdminAccount", () => {
  it("아이디가 한 글자면 forbidden", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "sup", "super");
    const create = new CreateAdminAccount(accounts);
    await expect(
      create.execute(superActor(), { loginId: "a", password: "secret12", role: "viewer", createdBy: "sup" }, "t"),
    ).rejects.toMatchObject({ reason: "forbidden" });
    conn.close();
  });

  it("이미 있는 아이디면 exists", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "sup", "super");
    await insertTestAdmin(accounts, "taken", "viewer");
    const create = new CreateAdminAccount(accounts);
    await expect(
      create.execute(superActor(), { loginId: "taken", password: "secret12", role: "viewer", createdBy: "sup" }, "t"),
    ).rejects.toMatchObject({ reason: "exists" });
    conn.close();
  });

  it("짧은 비밀번호면 weak_password", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "sup", "super");
    const create = new CreateAdminAccount(accounts);
    await expect(
      create.execute(superActor(), { loginId: "n1", password: "12345", role: "viewer", createdBy: "sup" }, "t"),
    ).rejects.toMatchObject({ reason: "weak_password" });
    conn.close();
  });

  it("admin 은 super 계정을 만들 수 없다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    const actor = { loginId: "adm", role: "admin" as const, permissions: permissionsForRole("admin") };
    await insertTestAdmin(accounts, "adm", "admin");
    const create = new CreateAdminAccount(accounts);
    await expect(
      create.execute(actor, { loginId: "x", password: "secret12", role: "super", createdBy: "adm" }, "t"),
    ).rejects.toMatchObject({ reason: "forbidden" });
    conn.close();
  });

  it("operator 는 super·admin 계정을 만들 수 없다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    const actor = { loginId: "op", role: "operator" as const, permissions: permissionsForRole("operator") };
    await insertTestAdmin(accounts, "op", "operator");
    const create = new CreateAdminAccount(accounts);
    await expect(
      create.execute(actor, { loginId: "bad", password: "secret12", role: "super", createdBy: "op" }, "t"),
    ).rejects.toMatchObject({ reason: "forbidden" });
    await expect(
      create.execute(actor, { loginId: "bad2", password: "secret12", role: "admin", createdBy: "op" }, "t"),
    ).rejects.toMatchObject({ reason: "forbidden" });
    conn.close();
  });

  it("admin 이 resetPassword override 로는 permission_exceeds", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    const actor = { loginId: "adm", role: "admin" as const, permissions: permissionsForRole("admin") };
    await insertTestAdmin(accounts, "adm", "admin");
    const create = new CreateAdminAccount(accounts);
    await expect(
      create.execute(
        actor,
        {
          loginId: "xv",
          password: "secret12",
          role: "viewer",
          createdBy: "adm",
          permissionsOverride: { accounts: { fields: { resetPassword: "edit" } } },
        },
        "t",
      ),
    ).rejects.toMatchObject({ reason: "permission_exceeds" });
    conn.close();
  });

  it("부분집합 custom override 로 viewer 를 만들 수 있다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "sup", "super");
    const create = new CreateAdminAccount(accounts);
    await create.execute(
      superActor(),
      {
        loginId: "v2",
        password: "secret12",
        role: "viewer",
        createdBy: "sup",
        permissionsOverride: { sync: { housing: { triggerSync: false } } },
      },
      "t",
    );
    const row = await accounts.findByLoginId("v2");
    expect(row?.permissionsOverride?.sync?.housing?.triggerSync).toBe(false);
    conn.close();
  });
});

describe("UpdateAdminAccount", () => {
  it("없는 대상이면 not_found", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "sup", "super");
    const update = new UpdateAdminAccount(accounts);
    await expect(update.execute(superActor(), "ghost", { disabled: true }, "t")).rejects.toMatchObject({
      reason: "not_found",
    });
    conn.close();
  });

  it("루트 계정은 등급·권한·비활성 변경 불가", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await ensureBootstrapAdmin(accounts, "t");
    const root = (await accounts.list())[0]!;
    await insertTestAdmin(accounts, "sup2", "super");
    const update = new UpdateAdminAccount(accounts);
    await expect(update.execute(superActor("sup2"), root.loginId, { role: "admin" }, "t2")).rejects.toMatchObject({
      reason: "root_protected",
    });
    await expect(
      update.execute(superActor("sup2"), root.loginId, { permissionsOverride: { dashboard: "view" } }, "t2"),
    ).rejects.toMatchObject({ reason: "root_protected" });
    await expect(update.execute(superActor("sup2"), root.loginId, { disabled: true }, "t2")).rejects.toMatchObject({
      reason: "root_protected",
    });
    conn.close();
  });

  it("마지막 super 는 등급 내리기 불가", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "only", "super");
    const update = new UpdateAdminAccount(accounts);
    const actor = { loginId: "only", role: "super" as const, permissions: permissionsForRole("super") };
    await expect(update.execute(actor, "only", { role: "admin" }, "t")).rejects.toMatchObject({ reason: "last_super" });
    conn.close();
  });

  it("super 가 2명이면 한 명 비활성화는 된다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "s1", "super");
    await insertTestAdmin(accounts, "s2", "super");
    const actor = { loginId: "s1", role: "super" as const, permissions: permissionsForRole("super") };
    const update = new UpdateAdminAccount(accounts);
    await update.execute(actor, "s2", { disabled: true }, "t");
    const row = await accounts.findByLoginId("s2");
    expect(row?.disabled).toBe(true);
    conn.close();
  });

  it("자기 자신은 비활성화할 수 없다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "me", "admin");
    await insertTestAdmin(accounts, "me2", "super");
    const actor = { loginId: "me", role: "admin" as const, permissions: permissionsForRole("admin") };
    const update = new UpdateAdminAccount(accounts);
    await expect(update.execute(actor, "me", { disabled: true }, "t")).rejects.toMatchObject({ reason: "forbidden" });
    conn.close();
  });

  it("permissions 필드 edit 없으면 override 변경 forbidden", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    const actorPerms = permissionsForRole("admin");
    actorPerms.accounts.fields.permissions = "view";
    const actor = { loginId: "adm", role: "admin" as const, permissions: actorPerms };
    await insertTestAdmin(accounts, "adm", "admin");
    await insertTestAdmin(accounts, "tgt", "viewer");
    const update = new UpdateAdminAccount(accounts);
    await expect(
      update.execute(actor, "tgt", { permissionsOverride: { dashboard: "view" } }, "t"),
    ).rejects.toMatchObject({ reason: "forbidden" });
    conn.close();
  });

  it("resetPassword 권한 없으면 타인 비밀번호 재설정 forbidden", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    const actor = { loginId: "adm", role: "admin" as const, permissions: permissionsForRole("admin") };
    await insertTestAdmin(accounts, "adm", "admin");
    await insertTestAdmin(accounts, "tgt", "viewer");
    const update = new UpdateAdminAccount(accounts);
    await expect(update.execute(actor, "tgt", { newPassword: "newpass9" }, "t")).rejects.toMatchObject({
      reason: "forbidden",
    });
    conn.close();
  });

  it("본인 비밀번호는 이 경로로 바꿀 수 없다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    const actor = superActor();
    await insertTestAdmin(accounts, "sup", "super");
    const update = new UpdateAdminAccount(accounts);
    await expect(update.execute(actor, "sup", { newPassword: "newpass9" }, "t")).rejects.toMatchObject({
      reason: "forbidden",
    });
    conn.close();
  });

  it("넓은 custom override 는 permission_exceeds", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    const actor = { loginId: "adm", role: "admin" as const, permissions: permissionsForRole("admin") };
    await insertTestAdmin(accounts, "adm", "admin");
    await insertTestAdmin(accounts, "tgt", "viewer");
    const update = new UpdateAdminAccount(accounts);
    await expect(
      update.execute(actor, "tgt", { permissionsOverride: { accounts: { fields: { resetPassword: "edit" } } } }, "t"),
    ).rejects.toMatchObject({ reason: "permission_exceeds" });
    conn.close();
  });

  it("clearPermissionsOverride 로 역할 기본으로 되돌린다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "sup", "super");
    await accounts.insert(
      {
        loginId: "v",
        role: "viewer",
        disabled: false,
        isRoot: false,
        permissionsOverride: { sync: { housing: { triggerSync: true } } },
        createdAt: "t",
        updatedAt: "t",
        createdBy: "sup",
      },
      hashAdminPassword("secret12"),
    );
    const update = new UpdateAdminAccount(accounts);
    await update.execute(superActor(), "v", { clearPermissionsOverride: true }, "t2");
    const row = await accounts.findByLoginId("v");
    expect(row?.permissionsOverride).toBeNull();
    conn.close();
  });

  it("super 가 super 가 resetPassword 로 다른 계정 비밀번호를 바꾼다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const { accounts } = createAdminRepositories(conn.db, systemClock);
    await insertTestAdmin(accounts, "sup", "super");
    await insertTestAdmin(accounts, "tgt", "viewer");
    const update = new UpdateAdminAccount(accounts);
    await update.execute(superActor(), "tgt", { newPassword: "newpass9" }, "t");
    const hash = await accounts.findPasswordHash("tgt");
    const { verifyAdminPassword } = await import("@/features/admin/domain/password");
    expect(verifyAdminPassword("newpass9", hash!)).toBe(true); // happy path
    conn.close();
  });
});