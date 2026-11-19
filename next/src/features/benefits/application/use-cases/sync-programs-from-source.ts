import type { SourceId } from "@/features/benefits/domain/enums";
import { createProgram, isSameProgram, mergeProgram } from "@/features/benefits/domain/identity";
import type { BenefitProgram } from "@/features/benefits/domain/program";
import type { ProgramRepository } from "../ports/program-repository";
import { SourceSkippedError, type ProgramSourcePort } from "../ports/program-source";
import type { SyncRunRepository, SyncRunStatus } from "../ports/sync-run-repository";
import type { Clock, Logger } from "@/common/application/system";

/** 소스별 수집 실행 결과 요약 */
export interface SourceSyncResult {
  source: SourceId;
  status: Exclude<SyncRunStatus, "running">;
  fetched: number;
  inserted: number;
  updated: number;
  error?: string;
}

/** 같은 배치 안의 중복 정책을 병합한다. */
export function dedupeBatch(programs: BenefitProgram[]): BenefitProgram[] {
  const result: BenefitProgram[] = [];
  for (const program of programs) {
    const idx = result.findIndex((r) => isSameProgram(r, program));
    if (idx >= 0) result[idx] = mergeProgram(result[idx]!, program);
    else result.push(program);
  }
  return result;
}

/** 외부 소스에서 정책을 가져와 저장소에 반영한다. */
export class SyncProgramsFromSource {
  constructor(
    private readonly sources: ProgramSourcePort[],
    private readonly repo: ProgramRepository,
    private readonly runs: SyncRunRepository,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  /** sourceIds 를 생략하면 등록된 모든 소스를 순차 실행한다. 한 소스 실패는 다른 소스에 영향 없음. */
  async execute(sourceIds?: SourceId[]): Promise<SourceSyncResult[]> {
    const targets = this.sources.filter((s) => !sourceIds || sourceIds.length === 0 || sourceIds.includes(s.id));
    const results: SourceSyncResult[] = [];
    for (const source of targets) {
      results.push(await this.syncOne(source));
    }
    return results;
  }

  private async syncOne(source: ProgramSourcePort): Promise<SourceSyncResult> {
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
      const drafts = await source.fetchPrograms({ fetchedAt: startedAt });
      const incoming = dedupeBatch(drafts.map(createProgram));
      const existing = await this.repo.findExistingFor(incoming);
      const merged = incoming.map((program) => {
        const match = existing.find((e) => isSameProgram(e, program));
        return match ? mergeProgram(match, program) : program;
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
