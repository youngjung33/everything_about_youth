import type { SourceId } from "@/features/housing/domain/enums";
import { createNotice, isSameNotice, mergeNotice } from "@/features/housing/domain/identity";
import type { Notice } from "@/features/housing/domain/notice";
import type { NoticeRepository } from "../ports/notice-repository";
import { SourceSkippedError, type NoticeSourcePort } from "../ports/notice-source";
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

/** 같은 배치 안의 중복 공고를 병합한다. */
export function dedupeBatch(notices: Notice[]): Notice[] {
  const result: Notice[] = [];
  for (const notice of notices) {
    const idx = result.findIndex((r) => isSameNotice(r, notice));
    if (idx >= 0) result[idx] = mergeNotice(result[idx]!, notice);
    else result.push(notice);
  }
  return result;
}

export class SyncNoticesFromSource {
  constructor(
    private readonly sources: NoticeSourcePort[],
    private readonly repo: NoticeRepository,
    private readonly runs: SyncRunRepository,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  /** sourceIds 를 생략하면 등록된 모든 소스를 순차 실행한다. 한 소스의 실패는 다른 소스에 영향을 주지 않는다. */
  async execute(sourceIds?: SourceId[]): Promise<SourceSyncResult[]> {
    const targets = this.sources.filter((s) => !sourceIds || sourceIds.length === 0 || sourceIds.includes(s.id));
    const results: SourceSyncResult[] = [];
    for (const source of targets) {
      results.push(await this.syncOne(source));
    }
    return results;
  }

  private async syncOne(source: NoticeSourcePort): Promise<SourceSyncResult> {
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
      const drafts = await source.fetchNotices({ fetchedAt: startedAt });
      const incoming = dedupeBatch(drafts.map(createNotice));
      const existing = await this.repo.findExistingFor(incoming);
      const merged = incoming.map((notice) => {
        const match = existing.find((e) => isSameNotice(e, notice));
        return match ? mergeNotice(match, notice) : notice;
      });
      const { inserted, updated } = await this.repo.upsertMany(dedupeBatch(merged));

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
