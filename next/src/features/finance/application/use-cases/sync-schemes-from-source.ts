import type { SourceId } from "@/features/finance/domain/enums";
import { createScheme, isSameScheme, mergeScheme } from "@/features/finance/domain/identity";
import type { FinanceScheme } from "@/features/finance/domain/scheme";
import type { SchemeRepository } from "../ports/scheme-repository";
import { SourceSkippedError, type SchemeSourcePort } from "../ports/scheme-source";
import type { SyncRunRepository, SyncRunStatus } from "../ports/sync-run-repository";
import type { Clock, Logger } from "@/common/application/system";

export interface SourceSyncResult {
  source: SourceId;
  status: Exclude<SyncRunStatus, "running">;
  fetched: number;
  inserted: number;
  updated: number;
  error?: string;
}

export function dedupeSchemeBatch(schemes: FinanceScheme[]): FinanceScheme[] {
  const result: FinanceScheme[] = [];
  for (const program of schemes) {
    const idx = result.findIndex((r) => isSameScheme(r, program));
    if (idx >= 0) result[idx] = mergeScheme(result[idx]!, program);
    else result.push(program);
  }
  return result;
}

export class SyncSchemesFromSource {
  constructor(
    private readonly sources: SchemeSourcePort[],
    private readonly repo: SchemeRepository,
    private readonly runs: SyncRunRepository,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  async execute(sourceIds?: SourceId[]): Promise<SourceSyncResult[]> {
    const targets = this.sources.filter((s) => !sourceIds || sourceIds.length === 0 || sourceIds.includes(s.id));
    const results: SourceSyncResult[] = [];
    for (const source of targets) {
      results.push(await this.syncOne(source));
    }
    return results;
  }

  private async syncOne(source: SchemeSourcePort): Promise<SourceSyncResult> {
    const startedAt = this.clock.now().toISOString();
    const runId = await this.runs.start(source.id, startedAt);

    const availability = source.checkAvailability();
    if (!availability.available) {
      const error = availability.reason ?? "사용할 수 없는 소스";
      this.logger.warn(`[${source.id}] 건너뜀: ${error}`);
      await this.runs.finish(runId, {
        status: "skipped",
        finishedAt: this.clock.now().toISOString(),
        fetchedCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        error,
      });
      return { source: source.id, status: "skipped", fetched: 0, inserted: 0, updated: 0, error };
    }

    try {
      const drafts = await source.fetchSchemes({ fetchedAt: startedAt });
      const incoming = dedupeSchemeBatch(drafts.map(createScheme));
      const existing = await this.repo.findExistingFor(incoming);
      const merged = incoming.map((program) => {
        const match = existing.find((e) => isSameScheme(e, program));
        return match ? mergeScheme(match, program) : program;
      });
      const { inserted, updated } = await this.repo.upsertMany(dedupeSchemeBatch(merged));

      await this.runs.finish(runId, {
        status: "success",
        finishedAt: this.clock.now().toISOString(),
        fetchedCount: drafts.length,
        insertedCount: inserted,
        updatedCount: updated,
      });
      this.logger.info(`[${source.id}] 완료: 수집 ${drafts.length}, 신규 ${inserted}, 갱신 ${updated}`);
      return { source: source.id, status: "success", fetched: drafts.length, inserted, updated };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      if (e instanceof SourceSkippedError) {
        this.logger.warn(`[${source.id}] 건너뜀: ${error}`);
        await this.runs.finish(runId, {
          status: "skipped",
          finishedAt: this.clock.now().toISOString(),
          fetchedCount: 0,
          insertedCount: 0,
          updatedCount: 0,
          error,
        });
        return { source: source.id, status: "skipped", fetched: 0, inserted: 0, updated: 0, error };
      }
      this.logger.error(`[${source.id}] 실패: ${error}`);
      await this.runs.finish(runId, {
        status: "failed",
        finishedAt: this.clock.now().toISOString(),
        fetchedCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        error,
      });
      return { source: source.id, status: "failed", fetched: 0, inserted: 0, updated: 0, error };
    }
  }
}
