import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { SyncRun, SyncRunFinish, SyncRunRepository, SyncRunStatus } from "@/features/jobs/application/ports/sync-run-repository";
import type { SourceId } from "@/features/jobs/domain/enums";
import type { SqliteDb } from "@/common/infrastructure/persistence/sqlite/client";
import { jobsSyncRuns } from "./schema";

function toRun(r: typeof jobsSyncRuns.$inferSelect): SyncRun {
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
    const row = this.db.insert(jobsSyncRuns).values({ source, status: "running", startedAt }).returning({ id: jobsSyncRuns.id }).get();
    return row.id;
  }

  async finish(id: number, r: SyncRunFinish): Promise<void> {
    this.db
      .update(jobsSyncRuns)
      .set({
        status: r.status,
        finishedAt: r.finishedAt,
        fetchedCount: r.fetchedCount,
        insertedCount: r.insertedCount,
        updatedCount: r.updatedCount,
        error: r.error ?? null,
      })
      .where(eq(jobsSyncRuns.id, id))
      .run();
  }

  async listRecent(limit: number): Promise<SyncRun[]> {
    return this.db.select().from(jobsSyncRuns).orderBy(desc(jobsSyncRuns.id)).limit(limit).all().map(toRun);
  }

  async lastSuccessAt(): Promise<string | null> {
    const row = this.db
      .select({ finishedAt: jobsSyncRuns.finishedAt })
      .from(jobsSyncRuns)
      .where(and(eq(jobsSyncRuns.status, "success"), isNotNull(jobsSyncRuns.finishedAt)))
      .orderBy(desc(jobsSyncRuns.finishedAt))
      .limit(1)
      .get();
    return row?.finishedAt ?? null;
  }

  async latestPerSource(): Promise<SyncRun[]> {
    const rows = this.db.select().from(jobsSyncRuns).orderBy(desc(jobsSyncRuns.id)).all();
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
