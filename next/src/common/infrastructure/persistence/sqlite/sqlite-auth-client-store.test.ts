import { describe, expect, it } from "vitest";
import { openSqlite, runMigrations } from "./client";
import { SqliteAuthClientStore } from "./sqlite-auth-client-store";
import { SqliteUserStore } from "./sqlite-user-store";

function setup() {
  const conn = openSqlite(":memory:");
  runMigrations(conn.db);
  return new SqliteAuthClientStore(conn.db);
}

describe("SqliteAuthClientStore", () => {
  it("만들고 찾고 폐기한다", async () => {
    const store = setup();
    expect(await store.find("d1")).toBeNull();

    await store.create("d1", "2026-10-18T00:00:00Z");
    expect(await store.find("d1")).toEqual({ id: "d1", revoked: false, userId: null });

    await store.touch("d1", "2026-10-18T01:00:00Z");
    expect(await store.revoke("d1")).toBe(true);
    expect(await store.find("d1")).toEqual({ id: "d1", revoked: true, userId: null });
    expect(await store.revoke("none")).toBe(false);
  });

  it("회원 세션은 회원 id 를 들고 있고, 회원의 모든 세션을 한 번에 폐기할 수 있다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const store = new SqliteAuthClientStore(conn.db);
    const users = new SqliteUserStore(conn.db);
    const at = "2026-10-18T00:00:00Z";
    const u1 = await users.findOrCreate("kakao", "k1", at, () => "user-1");
    const u2 = await users.findOrCreate("kakao", "k2", at, () => "user-2");

    await store.create("a", at, u1);
    await store.create("b", at, u1);
    await store.create("c", at, u2);
    await store.create("guest", at);

    expect((await store.find("a"))?.userId).toBe("user-1");
    expect(await store.revokeByUser("user-1")).toBe(2);
    expect((await store.find("a"))?.revoked).toBe(true);
    expect((await store.find("b"))?.revoked).toBe(true);
    expect((await store.find("c"))?.revoked).toBe(false);
    expect((await store.find("guest"))?.revoked).toBe(false);
  });

  it("같은 id 를 두 번 만들 수 없다", async () => {
    const store = setup();
    await store.create("d1", "2026-10-18T00:00:00Z");
    await expect(store.create("d1", "2026-10-18T00:00:00Z")).rejects.toThrow();
  });

  it("비회원 세션만 오래된 것·상한 초과분을 지운다", async () => {
    const conn = openSqlite(":memory:");
    runMigrations(conn.db);
    const store = new SqliteAuthClientStore(conn.db);
    const users = new SqliteUserStore(conn.db);
    const memberId = await users.findOrCreate("kakao", "k1", "2026-01-01T00:00:00Z", () => "user-1");

    await store.create("old-guest", "2020-01-01T00:00:00Z");
    await store.create("fresh-guest", "2026-10-18T00:00:00Z");
    await store.create("member", "2020-01-01T00:00:00Z", memberId);

    const deleted = await store.pruneGuestSessions({
      olderThanIso: "2025-01-01T00:00:00Z",
      maxRows: 1,
    });
    expect(deleted).toBeGreaterThanOrEqual(1);
    expect(await store.find("old-guest")).toBeNull();
    expect(await store.find("member")).not.toBeNull();
    expect(await store.find("fresh-guest")).not.toBeNull();
  });
});
