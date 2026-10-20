import { desc, eq } from "drizzle-orm";
import type { SyncRun, SyncRunFinish, SyncRunRepository, SyncRunStatus } from "@/features/housing/application/ports/sync-run-repository";
import type { SourceId } from "@/features/housing/domain/enums";
import type { SqliteDb } from "@/common/infrastructure/persistence/sqlite/client";
import { syncRuns } from "./schema";

function toRun(r: typeof syncRuns.$inferSelect): SyncRun {
  return {
    id: r.id,
    source: r.source as SourceId,
    status: r.status as SyncRunStatus,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    fetchedCount: r.fetchedCount,
    insertedCount: r.insertedCount,
    updatedCount: r.updatedCount,
    error: r.error,
  };
}

export class SqliteSyncRunRepository implements SyncRunRepository {
  constructor(private readonly db: SqliteDb) {}

  async start(source: SourceId, startedAt: string): Promise<number> {
    const row = this.db.insert(syncRuns).values({ source, status: "running", startedAt }).returning({ id: syncRuns.id }).get();
    return row.id;
  }

  async finish(id: number, r: SyncRunFinish): Promise<void> {
    this.db
      .update(syncRuns)
      .set({
        status: r.status,
        finishedAt: r.finishedAt,
        fetchedCount: r.fetchedCount,
        insertedCount: r.insertedCount,
        updatedCount: r.updatedCount,
        error: r.error ?? null,
      })
      .where(eq(syncRuns.id, id))
      .run();
  }

  async listRecent(limit: number): Promise<SyncRun[]> {
    return this.db.select().from(syncRuns).orderBy(desc(syncRuns.id)).limit(limit).all().map(toRun);
  }

  async latestPerSource(): Promise<SyncRun[]> {
    const rows = this.db.select().from(syncRuns).orderBy(desc(syncRuns.id)).all();
    const seen = new Set<string>();
    const latest: SyncRun[] = [];
    for (const r of rows) {
      if (seen.has(r.source)) continue;
      seen.add(r.source);
      latest.push(toRun(r));
    }
    return latest;
  }
}
