import { eq } from "drizzle-orm";
import type { FeatureFlagStore } from "@/common/application/feature-flags";
import type { SqliteDb } from "./client";
import { featureFlags } from "./schema";

export class SqliteFeatureFlagStore implements FeatureFlagStore {
  constructor(private readonly db: SqliteDb) {}

  async getOverrides(): Promise<Record<string, boolean>> {
    const rows = this.db.select().from(featureFlags).all();
    return Object.fromEntries(rows.map((r) => [r.id, r.enabled]));
  }

  async setOverride(id: string, enabled: boolean, updatedAt: string): Promise<void> {
    this.db
      .insert(featureFlags)
      .values({ id, enabled, updatedAt })
      .onConflictDoUpdate({ target: featureFlags.id, set: { enabled, updatedAt } })
      .run();
  }

  async clearOverride(id: string): Promise<void> {
    this.db.delete(featureFlags).where(eq(featureFlags.id, id)).run();
  }
}
