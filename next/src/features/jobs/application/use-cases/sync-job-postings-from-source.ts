import type { SourceId } from "@/features/jobs/domain/enums";
import { createJobPosting, isSameJobPosting, mergeJobPosting } from "@/features/jobs/domain/identity";
import type { JobPosting } from "@/features/jobs/domain/job-posting";
import type { JobPostingRepository } from "../ports/posting-repository";
import { SourceSkippedError, type JobPostingSourcePort } from "../ports/posting-source";
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

export function dedupePostingBatch(schemes: JobPosting[]): JobPosting[] {
  const result: JobPosting[] = [];
  for (const program of schemes) {
    const idx = result.findIndex((r) => isSameJobPosting(r, program));
    if (idx >= 0) result[idx] = mergeJobPosting(result[idx]!, program);
    else result.push(program);
  }
  return result;
}

export class SyncJobPostingsFromSource {
  constructor(
    private readonly sources: JobPostingSourcePort[],
    private readonly repo: JobPostingRepository,
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

  private async syncOne(source: JobPostingSourcePort): Promise<SourceSyncResult> {
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
      const drafts = await source.fetchPostings({ fetchedAt: startedAt });
      const incoming = dedupePostingBatch(drafts.map(createJobPosting));
      const existing = await this.repo.findExistingFor(incoming);
      const merged = incoming.map((program) => {
        const match = existing.find((e) => isSameJobPosting(e, program));
        return match ? mergeJobPosting(match, program) : program;
      });
      const { inserted, updated } = await this.repo.upsertMany(dedupePostingBatch(merged));

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
