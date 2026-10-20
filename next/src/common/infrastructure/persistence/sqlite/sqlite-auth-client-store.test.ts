import { describe, expect, it } from "vitest";
import { openSqlite, runMigrations } from "./client";
import { SqliteAuthClientStore } from "./sqlite-auth-client-store";

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
    expect(await store.find("d1")).toEqual({ id: "d1", revoked: false });

    await store.touch("d1", "2026-10-18T01:00:00Z");
    expect(await store.revoke("d1")).toBe(true);
    expect(await store.find("d1")).toEqual({ id: "d1", revoked: true });
    expect(await store.revoke("none")).toBe(false);
  });

  it("같은 id 를 두 번 만들 수 없다", async () => {
    const store = setup();
    await store.create("d1", "2026-10-18T00:00:00Z");
    await expect(store.create("d1", "2026-10-18T00:00:00Z")).rejects.toThrow();
  });
});
