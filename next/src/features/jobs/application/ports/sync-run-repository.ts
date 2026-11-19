import type { SourceId } from "@/features/jobs/domain/enums";

/** 수집 실행 상태 */
export type SyncRunStatus = "running" | "success" | "failed" | "skipped";

/** 수집 실행 이력 한 건 */
export interface SyncRun {
  id: number;
  source: SourceId;
  status: SyncRunStatus;
  startedAt: string;
  finishedAt: string | null;
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  error: string | null;
}

/** 실행 종료 시 기록할 통계·오류 */
export interface SyncRunFinish {
  status: Exclude<SyncRunStatus, "running">;
  finishedAt: string;
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  error?: string;
}

/** 수집 실행 이력 저장소 포트 */
export interface SyncRunRepository {
  start(source: SourceId, startedAt: string): Promise<number>;
  finish(id: number, result: SyncRunFinish): Promise<void>;
  listRecent(limit: number): Promise<SyncRun[]>;
  lastSuccessAt(): Promise<string | null>;
  latestPerSource(): Promise<SyncRun[]>;
}
