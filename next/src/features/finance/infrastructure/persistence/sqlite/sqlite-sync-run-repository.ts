import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { SyncRun, SyncRunFinish, SyncRunRepository, SyncRunStatus } from "@/features/finance/application/ports/sync-run-repository";
import type { SourceId } from "@/features/finance/domain/enums";
import type { SqliteDb } from "@/common/infrastructure/persistence/sqlite/client";
import { financeSyncRuns } from "./schema";

function toRun(r: typeof financeSyncRuns.$inferSelect): SyncRun {
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
    const row = this.db.insert(financeSyncRuns).values({ source, status: "running", startedAt }).returning({ id: financeSyncRuns.id }).get();
    return row.id;
  }

  async finish(id: number, r: SyncRunFinish): Promise<void> {
    this.db
      .update(financeSyncRuns)
      .set({
        status: r.status,
        finishedAt: r.finishedAt,
        fetchedCount: r.fetchedCount,
        insertedCount: r.insertedCount,
        updatedCount: r.updatedCount,
        error: r.error ?? null,
      })
      .where(eq(financeSyncRuns.id, id))
      .run();
  }

  async listRecent(limit: number): Promise<SyncRun[]> {
    return this.db.select().from(financeSyncRuns).orderBy(desc(financeSyncRuns.id)).limit(limit).all().map(toRun);
  }

  async lastSuccessAt(): Promise<string | null> {
    const row = this.db
      .select({ finishedAt: financeSyncRuns.finishedAt })
      .from(financeSyncRuns)
      .where(and(eq(financeSyncRuns.status, "success"), isNotNull(financeSyncRuns.finishedAt)))
      .orderBy(desc(financeSyncRuns.finishedAt))
      .limit(1)
      .get();
    return row?.finishedAt ?? null;
  }

  async latestPerSource(): Promise<SyncRun[]> {
    const rows = this.db.select().from(financeSyncRuns).orderBy(desc(financeSyncRuns.id)).all();
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
