import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { SyncRun, SyncRunFinish, SyncRunRepository, SyncRunStatus } from "@/features/benefits/application/ports/sync-run-repository";
import type { SourceId } from "@/features/benefits/domain/enums";
import type { SqliteDb } from "@/common/infrastructure/persistence/sqlite/client";
import { benefitSyncRuns } from "./schema";

function toRun(r: typeof benefitSyncRuns.$inferSelect): SyncRun {
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
    const row = this.db.insert(benefitSyncRuns).values({ source, status: "running", startedAt }).returning({ id: benefitSyncRuns.id }).get();
    return row.id;
  }

  async finish(id: number, r: SyncRunFinish): Promise<void> {
    this.db
      .update(benefitSyncRuns)
      .set({
        status: r.status,
        finishedAt: r.finishedAt,
        fetchedCount: r.fetchedCount,
        insertedCount: r.insertedCount,
        updatedCount: r.updatedCount,
        error: r.error ?? null,
      })
      .where(eq(benefitSyncRuns.id, id))
      .run();
  }

  async listRecent(limit: number): Promise<SyncRun[]> {
    return this.db.select().from(benefitSyncRuns).orderBy(desc(benefitSyncRuns.id)).limit(limit).all().map(toRun);
  }

  async lastSuccessAt(): Promise<string | null> {
    const row = this.db
      .select({ finishedAt: benefitSyncRuns.finishedAt })
      .from(benefitSyncRuns)
      .where(and(eq(benefitSyncRuns.status, "success"), isNotNull(benefitSyncRuns.finishedAt)))
      .orderBy(desc(benefitSyncRuns.finishedAt))
      .limit(1)
      .get();
    return row?.finishedAt ?? null;
  }

  async latestPerSource(): Promise<SyncRun[]> {
    const rows = this.db.select().from(benefitSyncRuns).orderBy(desc(benefitSyncRuns.id)).all();
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
