import { describe, expect, it } from "vitest";
import { FeatureFlags } from "@/common/application/feature-flags";
import { silentLogger, type Clock } from "@/common/application/system";
import { openSqlite, runMigrations } from "./client";
import { SqliteFeatureFlagStore } from "./sqlite-feature-flag-store";

const clock: Clock = { now: () => new Date("2026-10-18T00:00:00Z") };

function setup() {
  const conn = openSqlite(":memory:");
  runMigrations(conn.db);
  const store = new SqliteFeatureFlagStore(conn.db);
  const flags = new FeatureFlags(
    [
      { id: "housing", defaultEnabled: true },
      { id: "jobs", defaultEnabled: false },
    ],
    store,
    clock,
    silentLogger,
  );
  return { conn, store, flags };
}

describe("SqliteFeatureFlagStore", () => {
  it("저장하고 덮어쓰고 지운다", async () => {
    const { store } = setup();
    expect(await store.getOverrides()).toEqual({});

    await store.setOverride("housing", false, "2026-10-18T00:00:00Z");
    expect(await store.getOverrides()).toEqual({ housing: false });

    await store.setOverride("housing", true, "2026-10-18T01:00:00Z");
    expect(await store.getOverrides()).toEqual({ housing: true });

    await store.clearOverride("housing");
    expect(await store.getOverrides()).toEqual({});
  });

  it("FeatureFlags 와 함께: 재시작(새 인스턴스) 뒤에도 운영자 설정이 유지된다", async () => {
    const { conn, flags } = setup();
    await flags.set("housing", false);

    const again = new FeatureFlags([{ id: "housing", defaultEnabled: true }], new SqliteFeatureFlagStore(conn.db), clock);
    expect(await again.isEnabled("housing")).toBe(false);
  });
});
